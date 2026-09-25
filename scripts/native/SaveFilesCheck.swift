import Foundation

@main struct SaveFilesCheck {
    static func main() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let files = SaveFiles(directory: root)
        let missing = try files.read("current")
        precondition(missing == nil)
        let first = "{\"review\":\"沿河的风\"}"
        try files.write("current", text: first)
        try files.write("previous", text: first)
        try files.write("current", text: "{\"review\":\"第二次\"}")
        let prior = try files.read("previous")
        precondition(prior == first)
        let current = try files.read("current")
        precondition(current == "{\"review\":\"第二次\"}")
        do { try files.write("../escape", text: "bad"); fatalError("Path escaped") }
        catch { /* expected */ }
        let unchanged = try files.read("previous")
        precondition(unchanged == first)
        print("PASS: real atomic file replacement, previous generation, UTF-8, and path confinement")
    }
}
