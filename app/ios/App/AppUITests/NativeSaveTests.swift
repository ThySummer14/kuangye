import XCTest

// Drives the real app on a simulator to prove the native save path end to end.
// The simulator WebView has empty localStorage, so the seeded 347 balance can
// only come from Application Support through the KuangyeStorage plugin, and a
// completed task can only survive relaunch if the queued write really landed.
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

    func testCompletionWritesNativeSaveAndSurvivesRelaunch() throws {
        let app = XCUIApplication()
        app.launch()
        openTaskWall(app)

        XCTAssertTrue(text(containing: "347", in: app).waitForExistence(timeout: 20),
                      "seeded balance (native read) not shown")
        let complete = button(containing: "我完成了", in: app)
        XCTAssertTrue(complete.waitForExistence(timeout: 20), "active task card missing")
        complete.tap()

        let confirm = button(containing: "完成，收下这束光", in: app)
        XCTAssertTrue(confirm.waitForExistence(timeout: 20), "completion modal missing")
        snap(app, "01-modal")
        confirm.tap()

        let finish = button(containing: "收好了，回到地图", in: app)
        XCTAssertTrue(finish.waitForExistence(timeout: 20), "completion result missing")
        snap(app, "02-result")
        finish.tap()

        // Completion pays 15 lumens: 347 -> 362, visible once back on the map.
        XCTAssertTrue(text(containing: "362", in: app).waitForExistence(timeout: 20),
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
}
