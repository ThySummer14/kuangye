import Foundation

// The JavaScript layer owns schema validation and generation ordering.
// This layer exposes only two application-owned files, with atomic replacement.
final class SaveFiles {
    let directory: URL
    init(directory: URL) { self.directory = directory }

    private func url(_ name: String) throws -> URL {
        guard ["current", "previous"].contains(name) else {
            throw NSError(domain: "KuangyeStorage", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid save name"])
        }
        return directory.appendingPathComponent(name + ".json")
    }

    func read(_ name: String) throws -> String? {
        do {
            return try String(contentsOf: url(name), encoding: .utf8)
        } catch CocoaError.fileReadNoSuchFile {
            return nil
        }
    }

    func write(_ name: String, text: String) throws {
        let destination = try url(name)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data(text.utf8).write(to: destination, options: .atomic)
    }

    /// Removes both generations. Exported backups in Documents are user
    /// property and are deliberately left untouched.
    func deleteAll() throws {
        for name in ["current", "previous"] {
            try? FileManager.default.removeItem(at: url(name))
        }
    }
}
