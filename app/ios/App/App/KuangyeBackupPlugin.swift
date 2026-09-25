import Capacitor
import Foundation
import UniformTypeIdentifiers

// Backup leaves the sandbox only through explicit user actions: exports are
// written to the user-visible Documents folder and offered to the share sheet;
// imports only read what the user picked in the document picker.
@objc(KuangyeBackupPlugin)
public class KuangyeBackupPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "KuangyeBackupPlugin"
    public let jsName = "KuangyeBackup"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "exportBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "importBackup", returnType: CAPPluginReturnPromise)
    ]
    private var pendingImportCall: CAPPluginCall?

    @objc func exportBackup(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), let text = call.getString("text") else {
            call.reject("Missing backup content"); return
        }
        // Silent exports (the automatic pre-restore snapshot) stay in Documents;
        // explicit exports also open the share sheet.
        let interactive = call.getBool("interactive", true)
        DispatchQueue.main.async {
            do {
                let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
                let file = documents.appendingPathComponent(name)
                try Data(text.utf8).write(to: file, options: .atomic)
                if interactive {
                    let activity = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                    self.bridge?.viewController?.present(activity, animated: true)
                }
                call.resolve(["path": file.path])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func importBackup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingImportCall == nil else {
                call.reject("A backup import is already open"); return
            }
            self.pendingImportCall = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.json], asCopy: true)
            // Land directly on the backups this app exports; users still see
            // the full picker and can browse anywhere else.
            picker.directoryURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pendingImportCall else { return }
        pendingImportCall = nil
        guard let url = urls.first else { call.resolve(["text": NSNull()]); return }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        do {
            call.resolve(["text": try String(contentsOf: url, encoding: .utf8)])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        guard let call = pendingImportCall else { return }
        pendingImportCall = nil
        call.resolve(["text": NSNull()])
    }
}
