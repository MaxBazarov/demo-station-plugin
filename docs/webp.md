# How to convert exported PNG to webp on macOS
## Download script
Download and unzip <a target="_blank" href="https://github.com/MaxBazarov/demo-station-plugin/raw/main/docs/files/png_to_webp.sh.zip">bash script</a>.
Move it to a parent of a folder with unzipped prototype.

## Run script in Terminal
bash png_to_webp.sh YOUR_PROTOTYPE_FOLDER

## Webp installation
If you have no webp installed then follow the script instruction in Terminal

# Hwo to run png_to_webp.sh
Download and unzip <a target="_blank" href="hwebp-automator.sh.zip">Automator script</a>.

# Setting Up the Folder Action in Automator

## 🛠 Step-by-Step Guide

### 1. Open Automator

Launch **Automator.app** (Applications → Automator).

### 2. Create a new Folder Action

Go to **File → New**, then choose **Folder Action** and click **Choose**.

### 3. Select the watched folder

At the top of the workflow, use the **Folder** dropdown to select the folder where your zip files will appear (e.g., `Temp`).

### 4. Add the "Run Shell Script" action

In the left sidebar, search for **Run Shell Script** and drag it into the workflow area.

### 5. Configure the action

* **Shell:** `/bin/bash`
* **Pass input:** **as arguments**

> ⚠️ **This is critical.** If it stays on `to stdin`, the script will never receive the file path.

### 6. Paste the script

Replace the default content in the text field with webp-automator.sh content.

### 7. Save the workflow

Go to **File → Save** and give it a name, for example `AutoProcessZip.workflow`.

### 8. Enable Folder Actions

* Right-click the watched folder in Finder.
* Go to **Services → Folder Actions Setup…**
* Make sure **Enable Folder Actions** is checked.
* Confirm your folder and the `AutoProcessZip` script appear in the list.
  If not, add them manually with the **+** button.

---

## ✅ How to Test

1. Drop a `.zip` file into the watched folder.
2. Wait a few seconds.
3. Check the log:

   ```bash
   tail -30 /tmp/auto_zip_webp.log
