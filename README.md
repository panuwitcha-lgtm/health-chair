# Health Chair

เก้าอี้ตรวจท่านั่ง: ESP32-S3 อ่าน FSR 6 จุด + MPU6050 จำแนกท่านั่ง 7 ท่าด้วย Edge Impulse ส่งข้อมูลขึ้น ThingsBoard Cloud (MQTT) แล้วดูผลบนเว็บแอป

- **เว็บแอป (เปิดบน GitHub Pages):** https://nattaponwom-byte.github.io/health-chair/
- **ผล build firmware:** แท็บ [Actions](../../actions) ของ repo นี้

## โครงสร้าง repo

| โฟลเดอร์ | คืออะไร | คู่มือ |
|---|---|---|
| `firmware/` | โค้ด ESP32-S3 (VS Code + PlatformIO) ส่ง ThingsBoard + ใช้โมเดล Edge Impulse | [firmware/README.md](firmware/README.md) |
| `webapp/` | เว็บแอป React + Vite ดึงข้อมูลจาก ThingsBoard (มีโหมดเดโม) 16 หน้าจอตาม Screen Design | [webapp/README.md](webapp/README.md) |
| `.github/workflows/` | GitHub Actions: build เว็บขึ้น GitHub Pages และ build firmware ให้อัตโนมัติ | - |
| `.devcontainer/` | ตั้งค่า GitHub Codespaces (รันเว็บและ build firmware บน GitHub ได้โดยไม่ต้องลงโปรแกรม) | - |

## ฮาร์ดแวร์ที่โค้ดรองรับ

เลือกบอร์ดที่ `firmware/include/config.h` บรรทัด `#define BOARD`

| | `BOARD 1` บอร์ด kk | `BOARD 2` บอร์ด EasyEDA ของเอ็ม (ค่าเริ่มต้น) |
|---|---|---|
| MCU | ESP32-S3-WROOM-1-N16R8 | ESP32-S3-WROOM-1-N16R8 |
| FSR1–6 (หน้าซ้าย, หน้าขวา, หลังซ้าย, หลังขวา, พนักล่าง, พนักบน) | IO1, IO2, IO9, IO10, IO6, IO7 | IO3, IO9, IO4, IO5, IO6, IO7 |
| วัดแบต (หาร 2) | IO8 | IO10 |
| Buzzer | IO12 ผ่าน S8050 (active buzzer) | IO40 ผ่าน S8050 (buzzer 2300 Hz, โค้ดส่ง PWM 2300 Hz ให้) |
| LED แดง / เขียว | IO13 / IO14 | ไม่มี |
| MPU6050 SDA / SCL | IO39 / IO41 | IO38 / IO39 |
| USB (อัปโหลด + Serial) | Micro USB J10 → IO19/IO20 | USB2 → IO19/IO20 |
| ไฟ | 18650 × 4 ขนาน (1S4P), TP4056, MCP1826S 3.3V, สวิตช์เปิด/ปิด J2 | 18650 × 4 ขนาน, TP4056, AP2112K, สวิตช์ SW3 |

การทำงาน: เปิดสวิตช์แล้วบอร์ดติดแต่ Wi-Fi ยังปิด เช็ก FSR ทุก 1 วินาที มีคนนั่งจึงต่อ Wi-Fi และส่งข้อมูลทุก 1 วินาที (ส่งเฉพาะค่าที่เปลี่ยน และส่งครบทุกค่าทุก 60 วินาที) ลุกแล้วปิด Wi-Fi และส่งค่าแบตทุก 30 นาที

## ข้อมูลที่ส่งขึ้น ThingsBoard (ตรงกับ Data Element Design)

| key | ชนิด | ช่วงค่า | รหัสในเอกสาร |
|---|---|---|---|
| `posture` | Enum | empty, upright, lean_forward, lean_back, lean_left, lean_right, perch, unknown | PST-02 |
| `occupied` | Boolean | true / false | PST-03 |
| `bad_posture` | Boolean | true / false | PST-04 |
| `bad_posture_sec` | Integer | วินาที ≥ 0 | PST-05 |
| `sit_minutes` | Integer | นาที 0–1440 | PST-06 |
| `alert` | Enum | none / bad_posture / sit_too_long | PST-07 |
| `confidence`, `anomaly` | Decimal | 0.000–1.000, ≥ 0 | PST-08, PST-09 |
| `fsr1`–`fsr6` | **Integer** | **0–100 %** | SNS-01 ถึง SNS-06 |
| `backrest_deg` | Decimal | องศา 1 ตำแหน่ง | SNS-07 |
| `battery_v`, `battery_pct` | Decimal, Integer | 2.50–4.30 V, 0–100 % | DST-05, DST-06 |

FSR ที่ส่งขึ้น ThingsBoard และที่เว็บแอปแสดงเป็น **จำนวนเต็ม 0–100 (%)** ทุกที่ ส่วนข้อมูลที่ส่งให้ Edge Impulse (CSV ตอน `COLLECT_MODE 1`) ใช้ 0–1 ตามที่โมเดลต้องการ (EIS-03) ถ้าเอกสารฉบับไหนยังเขียนว่า fsr1–6 เป็น Double 0–1 ให้แก้เป็น Integer 0–100 %

Shared attributes ที่แก้จากเว็บแอปได้: `muted`, `sit_limit_min`, `bad_posture_alert_sec` (เก้าอี้ใช้) และ `rest_min` (ใช้ในเว็บแอปอย่างเดียว)

---

# วิธีทำทีละขั้นตอน

## ขั้นที่ 1: สร้าง repo และอัปโค้ดขึ้น GitHub

1. เข้า https://github.com/new
2. Repository name: `health-chair` → เลือก **Public** → **ไม่ต้อง**ติ๊ก Add a README → กด **Create repository**
3. อัปโค้ด เลือกวิธีใดวิธีหนึ่ง
   - **วิธี A (ง่ายสุด ผ่านหน้าเว็บ):** ในหน้า repo กด **uploading an existing file** → ลากไฟล์และโฟลเดอร์ทั้งหมดในโฟลเดอร์ `health-chair` ลงไป → กด **Commit changes**
     หมายเหตุ: หน้าเว็บอาจไม่อัปโฟลเดอร์ที่ขึ้นต้นด้วยจุด (`.github`, `.devcontainer`) และไฟล์ `.gitignore` ถ้าหน้า repo ไม่มีโฟลเดอร์ `.github` ให้สร้างเองทีละไฟล์:
     กด **Add file → Create new file** → ช่องชื่อพิมพ์ `.github/workflows/webapp-pages.yml` (พิมพ์ `/` แล้ว GitHub จะสร้างโฟลเดอร์ให้) → เปิดไฟล์เดียวกันในเครื่องด้วย Notepad copy ทั้งหมดมาวาง → **Commit changes**
     ทำแบบเดียวกันกับ `.github/workflows/firmware-build.yml`, `.devcontainer/devcontainer.json` และ `.gitignore`
   - **วิธี B (ใช้ git):** ติดตั้ง Git จาก https://git-scm.com แล้วเปิด Terminal ในโฟลเดอร์ `health-chair`
     ```bash
     git init
     git add .
     git commit -m "Health Chair firmware + web app"
     git branch -M main
     git remote add origin https://github.com/nattaponwom-byte/health-chair.git
     git push -u origin main
     ```
4. **ห้ามอัปรหัส Wi-Fi และ token ThingsBoard ขึ้น GitHub** ใส่ไว้ใน `firmware/include/secrets.h` เท่านั้น (ไฟล์นี้อยู่ใน `.gitignore` git จะไม่อัปขึ้นไป)
   ถ้าใช้วิธี A อย่าลากไฟล์ `secrets.h` ขึ้นไปด้วย

## ขั้นที่ 2: เปิดเว็บแอปบน GitHub Pages (ทำครั้งเดียว)

1. หน้า repo → แท็บ **Settings** → เมนูซ้าย **Pages**
2. หัวข้อ **Build and deployment** → Source เลือก **GitHub Actions**
3. ไปแท็บ **Actions** → เลือก **Web app (GitHub Pages)** ทางซ้าย → กด **Run workflow** → **Run workflow** (ครั้งต่อไปจะรันเองทุกครั้งที่ push)
4. รอจนขึ้นวงกลมสีเขียว ✓ (ประมาณ 1–2 นาที) แล้วเปิด https://nattaponwom-byte.github.io/health-chair/
5. ทดลองใช้: หน้าเข้าสู่ระบบกด **ทดลองใช้โหมดเดโม** จะเห็นข้อมูลจำลองครบทุกหน้า
6. ต่อกับเก้าอี้จริง: กรอกอีเมลและรหัสผ่านบัญชี ThingsBoard Cloud (บัญชีเดียวกับที่สร้างเครื่องในขั้นที่ 5)
7. ใส่ลิงก์เว็บไว้หน้า repo: หน้าแรกของ repo กดรูปเฟือง ⚙ ข้าง **About** → ติ๊ก **Use your GitHub Pages website** → **Save changes**

ถ้าหน้าเว็บบน GitHub Pages ต่อ ThingsBoard ไม่ได้ (ขึ้น "เชื่อมต่อ ThingsBoard ไม่ได้") แต่โหมดเดโมใช้ได้ ให้เปิดผ่าน Codespaces ในขั้นที่ 3 แทน เพราะ Codespaces ส่งต่อคำขอผ่าน proxy ของ Vite

## ขั้นที่ 3: เปิดและรันโค้ดบน GitHub ด้วย Codespaces (ไม่ต้องลงโปรแกรมในเครื่อง)

1. หน้า repo กดปุ่มเขียว **Code** → แท็บ **Codespaces** → **Create codespace on main**
2. รอ 2–3 นาที จะได้ VS Code ในเบราว์เซอร์ และติดตั้ง package ให้เอง
3. ที่ Terminal ด้านล่างพิมพ์
   ```bash
   cd webapp
   npm run dev
   ```
4. มุมขวาล่างจะเด้ง **Open in Browser** กดเพื่อเปิดเว็บ (หรือไปแท็บ **PORTS** → พอร์ต 5173 → กดรูปลูกโลก)
5. build firmware ใน Codespaces ได้ด้วย (ตรวจว่าโค้ดคอมไพล์ผ่าน แต่แฟลชลงบอร์ดจาก Codespaces ไม่ได้ ต้องทำในเครื่องตามขั้นที่ 4)
   ```bash
   cd /workspaces/health-chair/firmware
   pio run
   ```
6. เลิกใช้แล้วปิด: github.com/codespaces → **⋯** → **Stop codespace** (บัญชีฟรีได้ 60 ชม.ต่อเดือนสำหรับเครื่อง 2 core)

## ขั้นที่ 4: build และแฟลช firmware ลงบอร์ด

**ดูผล build บน GitHub:** แท็บ **Actions** → **Firmware (PlatformIO build)** วงกลมเขียว = คอมไพล์ผ่านทั้งบอร์ด kk และบอร์ดของเอ็ม คลิกเข้าไปดูได้ และดาวน์โหลดไฟล์ `.bin` ได้ที่หัวข้อ **Artifacts** ด้านล่าง (ไฟล์นี้ใช้ค่า Wi-Fi ตัวอย่าง ต่อเน็ตไม่ได้ ใช้ดูว่า build ผ่านเท่านั้น)

**แฟลชลงบอร์ดจริง (ต้องทำบนคอมที่เสียบบอร์ด):**
1. ติดตั้ง VS Code และ extension **PlatformIO IDE** (รายละเอียด [firmware/README.md ขั้นที่ 1](firmware/README.md#ขั้นที่-1-ติดตั้งโปรแกรมบนคอม-ทำครั้งเดียว))
2. ดาวน์โหลดโค้ด: หน้า repo → **Code** → **Download ZIP** แตกไว้ที่ `C:\hc\health-chair` (หรือ `git clone https://github.com/nattaponwom-byte/health-chair.git`)
3. VS Code → ไอคอน PlatformIO (หัวมด) → **Open Project** → เลือกโฟลเดอร์ `firmware`
4. copy `include/secrets.example.h` เป็น `include/secrets.h` แล้วใส่ `WIFI_SSID`, `WIFI_PASSWORD` (Wi-Fi 2.4 GHz), `TB_TOKEN` (ได้จากขั้นที่ 5)
5. เปิด `include/config.h` เช็ก `#define BOARD 2` (บอร์ดของเอ็ม ตั้งไว้แล้ว) หรือ `1` (บอร์ด kk) และ `COLLECT_MODE 0`
6. เปิดสวิตช์ (SW3 บนบอร์ดของเอ็ม / J2 บนบอร์ด kk) → เสียบสาย USB ที่ส่งข้อมูลได้ (ไม่ใช่สายชาร์จอย่างเดียว) เข้าช่อง USB บนบอร์ด → กด **→ (Upload)** ที่แถบล่าง
   อัปโหลดไม่เข้า: กด BOOT ค้าง กด RESET แล้วปล่อย BOOT แล้วกด Upload ใหม่
7. กดรูปปลั๊ก (Serial Monitor) ควรเห็น `Health Chair 1.4.0 | ...` และ `ThingsBoard connected` (ตอนทดสอบตั้ง `LOW_POWER 0` ก่อน เพราะตอนเครื่องหลับ Serial ทาง USB จะหลุด)

## ขั้นที่ 5: ThingsBoard

ทำตาม [firmware/README.md ขั้นที่ 2](firmware/README.md#ขั้นที่-2-thingsboard-ทำก่อน-เพราะทดสอบได้เลยแม้ยังไม่มีโมเดล) โดยย่อ
1. สมัคร https://thingsboard.cloud → **Entities → Devices → + → Add new device** ชื่อ `Health Chair` → **Copy access token** ไปใส่ `TB_TOKEN` ใน `secrets.h`
2. แฟลช firmware (ขั้นที่ 4) แล้วนั่งบนเก้าอี้ ดูแท็บ **Latest telemetry** ของเครื่อง ต้องเห็น `posture`, `fsr1`–`fsr6` ฯลฯ
3. สร้าง Dashboard และ Alarm (`sit_minutes ≥ 45`, `battery_pct < 15`) ตามหัวข้อ 2.3–2.4
4. เว็บแอปใช้บัญชี ThingsBoard เดียวกันล็อกอิน แอปจะหาเครื่องให้เอง หรือกรอก Device ID ในหน้า "เชื่อมเก้าอี้"

## ขั้นที่ 6: Edge Impulse

ทำตาม [firmware/README.md ขั้นที่ 3](firmware/README.md#ขั้นที่-3-edge-impulse-สอนโมเดลให้รู้จักท่านั่ง) โดยย่อ
1. สร้างโปรเจกต์ชื่อ **Health Chair** ที่ https://studio.edgeimpulse.com
2. ตั้ง `COLLECT_MODE 1` → แฟลช → รัน `edge-impulse-data-forwarder --frequency 20` เก็บข้อมูล 7 label: `empty, upright, lean_forward, lean_back, lean_left, lean_right, perch`
3. Impulse: window 2000 ms, stride 500 ms, **Flatten** + Classification + Anomaly (K-means) → Train
4. Deployment → **Arduino library** → แตก zip ไว้ใน `firmware/lib/Health_Chair_inferencing/`
5. ตั้ง `COLLECT_MODE 0` → แฟลชใหม่ Serial Monitor จะขึ้น `model: edge_impulse`
6. อัปโฟลเดอร์ `firmware/lib/Health_Chair_inferencing/` ขึ้น GitHub ด้วย (git: `git add firmware/lib && git commit -m "Add Edge Impulse model" && git push`) แล้วดูใน Actions ว่า build ผ่านพร้อมโมเดล

ยังไม่มีโมเดลก็ build ได้ เครื่องจะจำแนกท่าด้วยกฎจากค่า FSR ไปก่อน

## ขั้นที่ 7: ส่งงานอาจารย์

ส่งลิงก์เหล่านี้
- โค้ด: https://github.com/nattaponwom-byte/health-chair
- เว็บแอป: https://nattaponwom-byte.github.io/health-chair/
- ผล build firmware: https://github.com/nattaponwom-byte/health-chair/actions

ถ้าแก้โค้ดใน Codespaces ให้กด Source Control (ไอคอนกิ่งไม้ทางซ้าย) → พิมพ์ข้อความ → **Commit** → **Sync Changes** เว็บบน GitHub Pages จะอัปเดตเองใน 1–2 นาที

## ข้อจำกัดที่รู้อยู่

- firmware ยังไม่ได้ทดสอบกับบอร์ดจริง ค่ากระแสและอายุแบต (ประมาณ 25–30 วัน ที่นั่งวันละ 8 ชม.) มาจากการคำนวณ
- เกณฑ์ท่านั่งแบบกฎ (ตอนยังไม่มีโมเดล) ยังไม่ได้ปรับกับเก้าอี้จริง
- MQTT พอร์ต 1883 ไม่เข้ารหัส
- สมัครบัญชีเองในเว็บแอปไม่ได้ ต้องสร้างผู้ใช้ใน ThingsBoard

## สมาชิก

| รหัส | ชื่อ |
|---|---|
| 68091387 | นายสุริยกานต์ ขยายวงศ์ |
| 68107226 | นายนัฐพล วงษาชัย |
| 68098231 | นายภาณุวิชญ์ ชนะดิษฐ์ |
| 68107024 | นายคามิน อินศรีแก้ว |
| 68099712 | นายชลณธร มั่งมี |
