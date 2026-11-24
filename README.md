# NestJS Advanced Backend Engineering — Shaxsiy Mentor Kursi

> **Maqsad:** oddiy NestJS CRUD API yoza oladigan dasturchidan — professional backend tizimlarni **mustaqil loyihalay oladigan, yoza oladigan, test qila oladigan va qo'llab-quvvatlay oladigan** Advanced Backend Engineer'ga aylanish.

Bu kursda **men — sizning mentoringizman, dasturchingiz emas**. Yechimni men yozib bermayman: siz yozasiz, men tekshiraman, tushuntiraman va yo'naltiraman.

---

## 1. Kurs qanday ishlaydi

Har bir mavzu **qat'iy bir xil** 3 bosqichdan iborat:

| # | Bosqich | Fayl | Nima uchun |
|---|---------|------|-----------|
| 1 | **Nazariya** | `README.md` | Tushuncha, analogiya, ichki mexanizm, xatolar |
| 2 | **Amaliy topshiriq** | `assignment.md` | Haqiqiy biznes masalasi, progressiv hintlar (to'liq yechim YO'Q) |
| 3 | **Tayyor testlar** | `tests/` | Topshiriq *taqdim etilishidan oldin* yozilgan Jest testlari |

**Mavzu tugagan hisoblanadi**, faqat va faqat **barcha majburiy testlar o'tganda** (`PROGRESS.md` da belgilanadi).
Keyingi mavzuga faqat oldingisi tugagach o'tamiz.

### Qoidalar (ikki tomonlama kelishuv)

1. Yechimni birinchi bo'lib siz yozasiz. Men faqat hint beraman (4 darajali: muammo → tushunchalar → arxitektura yo'nalishi → qadamlar).
2. Xato chiqsa — avval **sababini** tushuntiraman, keyin tuzatish yo'lini.
3. Testlarni o'zgartirib "o'tkazib" yubormang. Testlar *talab*ni tekshiradi, implementatsiyani emas. Agar test noto'g'ri deb o'ylasangiz — menga ayting, birga muhokama qilamiz.
4. Kodingizni Senior Engineer sifatida review qilaman: arxitektura, SOLID, xavfsizlik, performance, maintainability.
5. Dizayn pattern'larni faqat **haqiqiy muammoni yechganda** ishlatamiz. Ortiqcha murakkablik — xato.

---

## 2. Loyiha tuzilmasi

```text
nestjs-advanced-training/
├── README.md              ← siz shu yerdasiz
├── PROGRESS.md            ← har bir mavzu holati (nazariya / topshiriq / test / yakun)
├── package.json           ← yagona dependency'lar va test skriptlari
├── jest.config.js         ← barcha modullar uchun yagona Jest sozlamasi
├── docker-compose.yml     ← test uchun izolyatsiyalangan PostgreSQL (5433-port)
├── .env.example           ← test bazasi sozlamalari
├── docs/
│   ├── roadmap.md         ← to'liq o'quv yo'l xaritasi va bog'liqliklar
│   ├── architecture.md    ← kurs arxitekturasi va ServiceHub'ning maqsadli arxitekturasi
│   └── glossary.md        ← atamalar lug'ati (o'zbekcha izoh bilan)
├── shared/
│   └── testing/           ← test uchun umumiy yordamchilar (test DB sozlamasi)
├── modules/
│   └── 01-repository-pattern/
│       ├── README.md      ← nazariya
│       ├── assignment.md  ← topshiriq
│       ├── tests/         ← tayyor testlar (o'zgartirilmaydi)
│       └── src/           ← SIZ shu yerga yozasiz
└── servicehub/            ← yakuniy capstone loyiha (hozircha bo'sh)
```

Har bir keyingi mavzu uchun `modules/NN-nomi/` papkasi shu tuzilmada yaratiladi.

---

## 3. Boshlash (bir martalik sozlash)

**Talablar:** Node.js 20+, npm, Docker (+ Docker Compose).

```bash
cd nestjs-advanced-training
npm install                # dependency'larni o'rnatish
cp .env.example .env       # (allaqachon yaratilgan bo'lishi mumkin)
npm run db:up              # PostgreSQL'ni Docker'da ishga tushirish (5433-port)
```

> Nega Docker? Testlar **haqiqiy PostgreSQL** bilan ishlashi kerak: Query Builder, constraint'lar,
> tranzaksiya va concurrency xatti-harakatini SQLite yoki mock bilan to'g'ri sinab bo'lmaydi.
> Baza RAM'da (`tmpfs`) ishlaydi: tez va har safar toza. Port 5433 — kompyuteringizdagi mavjud PostgreSQL (5432) bilan to'qnashmaslik uchun.

### Testlarni ishga tushirish

```bash
npm run test:m01          # 1-modul, majburiy testlar
npm run test:m01:bonus    # 1-modul, bonus testlar (ixtiyoriy)
npm test                  # hamma modullar (bonus'siz)
npm run typecheck         # faqat TypeScript tekshiruvi
npm run db:down           # bazani to'xtatish
```

---

## 4. Yakuniy maqsad — ServiceHub

Kurs oxirida o'rgangan hamma narsangizni bitta ishlaydigan loyihaga birlashtirasiz:
**ServiceHub — Multi-Branch Service Booking Platform** (CUSTOMER / STAFF / MANAGER / ADMIN rollari,
bron qilish, bir-biriga to'g'ri kelmaydigan vaqtlar, BullMQ bildirishnomalar, to'lovlar uchun Adapter,
Audit Log va hokazo). Tafsilotlar: [`docs/architecture.md`](docs/architecture.md).

## 5. Hujjatlar

- 🗺 [Yo'l xaritasi](docs/roadmap.md) — qaysi mavzu nimaga tayanadi
- 🏛 [Arxitektura](docs/architecture.md)
- 📖 [Lug'at](docs/glossary.md)
- ✅ [Jarayon](PROGRESS.md)

## 6. Hozirgi qadam

👉 **[Modul 01 — Repository Pattern](modules/01-repository-pattern/README.md)** (avval nazariya, keyin `assignment.md`).
