import Capacitor

class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(KuangyeStoragePlugin())
        bridge?.registerPluginInstance(KuangyeBackupPlugin())
    }
}
