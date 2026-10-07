package dev.kuangye.prototype;

import android.app.Activity;
import android.content.Intent;
import android.content.ContentValues;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.AtomicFile;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONObject;

/** Android's document picker grants access only to the file the user chooses. */
@CapacitorPlugin(name = "KuangyeBackup")
public class KuangyeBackupPlugin extends Plugin {
    private boolean pickerOpen;
    private static final int MAX_BYTES = 16 * 1024 * 1024;

    private String name(PluginCall call) {
        String name = call.getString("name", "kuangye.json");
        if (name.contains("/") || name.contains("\\") || name.startsWith(".")) {
            throw new IllegalArgumentException("Invalid file name");
        }
        return name;
    }

    @PluginMethod
    public void exportBackup(PluginCall call) {
        try {
            String text = call.getString("text");
            if (text == null) throw new IllegalArgumentException("Missing backup");
            if (call.getBoolean("interactive", true) || Build.VERSION.SDK_INT < 29) {
                createDocument(call, "application/json");
            } else {
                // A distinct snapshot for every restore, never overwrite yesterday's safety copy.
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, "before-restore-" + System.currentTimeMillis() + "-" + name(call));
                values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/Kuangye");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                var resolver = getContext().getContentResolver();
                var uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new java.io.IOException("无法创建原进度备份");
                try (var output = resolver.openOutputStream(uri, "w")) {
                    if (output == null) throw new java.io.IOException("无法写入原进度备份");
                    output.write(text.getBytes(StandardCharsets.UTF_8));
                } catch (Exception error) { resolver.delete(uri, null, null); throw error; }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, values, null, null);
                call.resolve(new JSObject().put("path", uri.toString()));
            }
        } catch (Exception error) { call.reject("无法导出备份", error); }
    }

    @PluginMethod
    public void exportFile(PluginCall call) {
        createDocument(call, call.getString("mime", "application/octet-stream"));
    }

    private void createDocument(PluginCall call, String mime) {
        if (pickerOpen) { call.reject("文件选择器已经打开"); return; }
        try {
            String filename = name(call);
            // Capacitor persists pending calls in the Activity Bundle. Keep large
            // JSON/images out of Binder's ~1 MB transaction limit, including on rotation.
            byte[] bytes = call.getString("base64") != null
                ? Base64.decode(call.getString("base64"), Base64.DEFAULT)
                : call.getString("text", "").getBytes(StandardCharsets.UTF_8);
            String stagedName = "export-" + UUID.randomUUID() + ".bin";
            AtomicFile staged = new AtomicFile(new File(getContext().getCacheDir(), stagedName));
            var output = staged.startWrite();
            try { output.write(bytes); staged.finishWrite(output); }
            catch (Exception error) { staged.failWrite(output); throw error; }
            call.getData().remove("base64");
            call.getData().remove("text");
            call.getData().put("stagedExport", stagedName);
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mime);
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            pickerOpen = true;
            startActivityForResult(call, intent, "exportResult");
        } catch (Exception error) { pickerOpen = false; call.reject("无法打开保存位置", error); }
    }

    @ActivityCallback
    private void exportResult(PluginCall call, ActivityResult result) {
        pickerOpen = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            removeStagedExport(call);
            call.reject("已取消保存", "CANCELLED"); return;
        }
        try {
            var uri = result.getData().getData();
            try (var input = new FileInputStream(stagedExport(call));
                 var output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new java.io.IOException("No output stream");
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            }
            call.resolve(new JSObject().put("path", uri.toString()));
        } catch (Exception error) { call.reject("文件未能保存，请重新导出", error); }
        finally { removeStagedExport(call); }
    }

    private File stagedExport(PluginCall call) {
        String name = call.getString("stagedExport", "");
        if (!name.matches("export-[a-f0-9-]{36}\\.bin")) throw new IllegalArgumentException("Invalid export");
        return new File(getContext().getCacheDir(), name);
    }

    private void removeStagedExport(PluginCall call) {
        try { stagedExport(call).delete(); } catch (Exception ignored) { /* No pending file. */ }
    }

    @PluginMethod
    public void importBackup(PluginCall call) {
        if (pickerOpen) { call.reject("文件选择器已经打开"); return; }
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*"); // Some document providers classify JSON as text/plain.
        pickerOpen = true;
        try { startActivityForResult(call, intent, "importResult"); }
        catch (Exception error) { pickerOpen = false; call.reject("无法打开备份文件", error); }
    }

    @ActivityCallback
    private void importResult(PluginCall call, ActivityResult result) {
        pickerOpen = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.resolve(new JSObject().put("text", JSONObject.NULL)); return;
        }
        try (var input = getContext().getContentResolver().openInputStream(result.getData().getData())) {
            if (input == null) throw new java.io.IOException("No input stream");
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (bytes.size() + count > MAX_BYTES) throw new java.io.IOException("备份超过 16 MB");
                bytes.write(buffer, 0, count);
            }
            call.resolve(new JSObject().put("text", bytes.toString(StandardCharsets.UTF_8.name())));
        } catch (Exception error) { call.reject("无法读取这份备份", error); }
    }
}
