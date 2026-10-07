package dev.kuangye.prototype;

import android.util.AtomicFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Only the two app-owned generations; schema and ordering stay in storage.js. */
@CapacitorPlugin(name = "KuangyeStorage")
public class KuangyeStoragePlugin extends Plugin {
    private AtomicFile file(String name) {
        if (!"current".equals(name) && !"previous".equals(name)) {
            throw new IllegalArgumentException("Invalid save name");
        }
        return new AtomicFile(new File(new File(getContext().getFilesDir(), "saves"), name + ".json"));
    }

    @PluginMethod
    public synchronized void read(PluginCall call) {
        try {
            AtomicFile file = file(call.getString("name"));
            JSObject result = new JSObject();
            // AtomicFile also recovers an interrupted replacement on openRead.
            Object text = JSONObject.NULL;
            try {
                text = new String(file.readFully(), StandardCharsets.UTF_8);
            } catch (java.io.FileNotFoundException error) {
                if (file.getBaseFile().exists()) throw error;
            }
            result.put("text", text);
            call.resolve(result);
        } catch (Exception error) { call.reject("无法读取本地存档", error); }
    }

    @PluginMethod
    public synchronized void write(PluginCall call) {
        FileOutputStream output = null;
        AtomicFile file = null;
        try {
            file = file(call.getString("name"));
            String text = call.getString("text");
            if (text == null) throw new IllegalArgumentException("Missing save content");
            output = file.startWrite();
            output.write(text.getBytes(StandardCharsets.UTF_8));
            file.finishWrite(output);
            call.resolve();
        } catch (Exception error) {
            if (file != null && output != null) file.failWrite(output);
            call.reject("无法保存进度，原存档已保留", error);
        }
    }

    @PluginMethod
    public synchronized void deleteAll(PluginCall call) {
        try {
            for (String name : new String[]{"current", "previous"}) {
                AtomicFile file = file(name);
                file.delete();
                if (file.getBaseFile().exists()) throw new java.io.IOException("Unable to delete " + name);
            }
            call.resolve();
        } catch (Exception error) { call.reject("未能清除本地存档", error); }
    }
}
