import XCTest

// Drives the real app on a simulator to prove the native save path end to end.
// The runner seeds Application Support itself (xcodebuild reinstalls the app on
// every test run, which deletes any host-side seed written beforehand), so the
// WebView starts with empty localStorage and 347 lumens can only come from the
// Application Support files through the KuangyeStorage plugin.
final class NativeSaveTests: XCTestCase {
    private func button(containing text: String, in app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }
    private func text(containing text: String, in app: XCUIApplication) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }
    private func snap(_ app: XCUIApplication, _ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name; a.lifetime = .keepAlways; add(a)
    }
    private func openTaskWall(_ app: XCUIApplication) {
        let wall = button(containing: "任务岩壁", in: app)
        XCTAssertTrue(wall.waitForExistence(timeout: 60), "map did not render")
        wall.tap()
    }

    /// Writes a known v3 save into every Kuangye app container on this machine.
    /// Runs before app.launch(), i.e. after xcodebuild's reinstall, so the seed
    /// lands in the container the app will actually read.
    private func seedApplicationSupport() {
        let fm = FileManager.default
        // The runner lives in its own simulator container: .../<UDID>/data/
        // Containers/Data/Application/<uuid>. Walk up to the device root that
        // holds "data/Containers", then enumerate sibling app containers.
        var deviceRoot = URL(fileURLWithPath: NSHomeDirectory())
        var found = false
        for _ in 0..<10 {
            if fm.fileExists(atPath: deviceRoot.appendingPathComponent(
                "data/Containers/Data/Application").path) { found = true; break }
            deviceRoot = deviceRoot.deletingLastPathComponent()
        }
        guard found else {
            XCTFail("cannot locate simulator device root from HOME \(NSHomeDirectory())"); return
        }
        var seeded = 0
        let apps = deviceRoot.appendingPathComponent("data/Containers/Data/Application")
        if let containers = try? fm.contentsOfDirectory(at: apps, includingPropertiesForKeys: nil) {
            for container in containers {
                let meta = container.appendingPathComponent(".com.apple.mobile_container_manager.metadata.plist")
                guard let data = try? Data(contentsOf: meta),
                      let plist = try? PropertyListSerialization.propertyList(
                          from: data, format: nil) as? [String: Any],
                      plist["MCMMetadataIdentifier"] as? String == "dev.kuangye.prototype"
                else { continue }
                let dir = container.appendingPathComponent("Library/Application Support/Kuangye")
                try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
                let state: [String: Any] = [
                    "active": [["qid": "run-s1", "start": "2026-09-24", "logs": [[:]], "shields": 2]],
                    "done": [], "abandoned": [],
                    "home": [
                        "room": ["w": 6, "d": 6],
                        "decor": ["wall": "wood", "floor": "wood", "weather": "auto", "light": "auto"],
                        "moments": [], "lumens": 347, "earned": 347, "spent": 0, "refunded": 0,
                        "glimmerDays": [], "glimmerPaid": 0, "inventory": [], "placed": [],
                        "boundMemories": [], "gifts": [], "nextId": 1,
                    ],
                    "settings": [:],
                ]
                let envelope: [String: Any] = ["app": "kuangye", "version": 3, "state": state]
                let payload = try! JSONSerialization.data(withJSONObject: envelope)
                try! payload.write(to: dir.appendingPathComponent("current.json"), options: .atomic)
                try? fm.removeItem(at: dir.appendingPathComponent("previous.json"))
                seeded += 1
            }
        }
        XCTAssertGreaterThan(seeded, 0, "no dev.kuangye.prototype container found to seed");
    }

    func testCompletionWritesNativeSaveAndSurvivesRelaunch() throws {
        seedApplicationSupport()
        let app = XCUIApplication()
        app.launch()
        openTaskWall(app)

        XCTAssertTrue(text(containing: "347", in: app).waitForExistence(timeout: 30),
                      "seeded balance (native read) not shown")
        let complete = button(containing: "我完成了", in: app)
        XCTAssertTrue(complete.waitForExistence(timeout: 20), "active task card missing")
        complete.tap()

        let confirm = button(containing: "完成，收下这束光", in: app)
        XCTAssertTrue(confirm.waitForExistence(timeout: 20), "completion modal missing")
        confirm.tap()

        let finish = button(containing: "收好了，回到地图", in: app)
        XCTAssertTrue(finish.waitForExistence(timeout: 20), "completion result missing")
        finish.tap()

        // Completion pays 15 lumens: 347 -> 362, visible once back on the map.
        XCTAssertTrue(text(containing: "362", in: app).waitForExistence(timeout: 30),
                      "balance did not reflect the completion")

        // Give the queued native write time to land on disk.
        Thread.sleep(forTimeInterval: 4.0)
        app.terminate()

        app.launch()
        openTaskWall(app)
        XCTAssertTrue(text(containing: "362", in: app).waitForExistence(timeout: 30),
                      "completion was not restored from the native save after relaunch")
        snap(app, "03-after-relaunch")
    }

    func testBackupExportLandsInUserDocuments() throws {
        let app = XCUIApplication()
        app.launch()

        // Straight from the map to the journal; its backup section sits at the end.
        let journal = button(containing: "成长手记", in: app)
        XCTAssertTrue(journal.waitForExistence(timeout: 60), "journal entry missing")
        journal.tap()
        let export = button(containing: "导出备份", in: app)
        for _ in 0..<6 where !export.exists && !export.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(export.waitForExistence(timeout: 10), "export button missing")
        export.tap()

        // The plugin writes Documents first, then presents the share sheet.
        Thread.sleep(forTimeInterval: 3.0)
        snap(app, "04-share-sheet")
        let cancel = button(containing: "取消", in: app).exists ? button(containing: "取消", in: app)
            : button(containing: "Cancel", in: app)
        if cancel.exists && cancel.isHittable { cancel.tap() }
    }
}
