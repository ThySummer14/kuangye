import Capacitor
import Foundation

@objc(KuangyeStoragePlugin)
public class KuangyeStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KuangyeStoragePlugin"
    public let jsName = "KuangyeStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise)
    ]
    private let queue = DispatchQueue(label: "dev.kuangye.storage")
    private lazy var files = SaveFiles(directory: FileManager.default.urls(
        for: .applicationSupportDirectory, in: .userDomainMask
    )[0].appendingPathComponent("Kuangye", isDirectory: true))

    @objc func read(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else { call.reject("Missing name"); return }
        queue.async {
            do { call.resolve(["text": try self.files.read(name) as Any? ?? NSNull()]) }
            catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), let text = call.getString("text") else {
            call.reject("Missing save content"); return
        }
        queue.async {
            do { try self.files.write(name, text: text); call.resolve() }
            catch { call.reject(error.localizedDescription) }
        }
    }
}
