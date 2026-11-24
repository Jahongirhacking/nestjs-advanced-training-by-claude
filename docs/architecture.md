# Arxitektura

Bu hujjat ikki narsani tasvirlaydi:

1. **Kurs infratuzilmasi** — mashq va testlar qanday tashkil etilgan.
2. **ServiceHub (capstone)** — yakuniy loyihaning *maqsadli* arxitekturasi. Hozircha bu **reja**: kod yozilmaydi, har bir qism tegishli mavzu o'tilgach quriladi.

---

## 1. Kurs infratuzilmasi

```text
                ┌────────────────────────────────────────────┐
                │ modules/NN-mavzu/tests/*.spec.ts  (tayyor) │
                └───────────────┬────────────────────────────┘
                                │ import (shartnoma)
                ┌───────────────▼────────────────────────────┐
                │ modules/NN-mavzu/src/...   (SIZ yozasiz)   │
                └───────────────┬────────────────────────────┘
                                │ TypeORM
                ┌───────────────▼────────────────────────────┐
                │ PostgreSQL 16 (Docker, 5433, tmpfs)        │
                └────────────────────────────────────────────┘
```

**Shartnoma yondashuvi.** Testlar oldindan yozilgani uchun, `assignment.md` da *nom va imzolar shartnomasi* beriladi
(fayl yo'li, export nomi, metod imzosi). Ichki implementatsiya — to'liq sizniki.

**Test turlari va nima uchun:**

| Tur | Baza | Nimani tekshiradi | Tezlik |
|-----|------|-------------------|--------|
| Unit | yo'q (fake/mocks) | Biznes qoidalari, xatolarni o'girish | ms |
| Integration | haqiqiy PostgreSQL | SQL, constraint, tranzaksiya, concurrency | 10–100 ms |
| E2E | haqiqiy PostgreSQL + HTTP | URL, status kod, JSON shakli, validatsiya | 10–100 ms |

**Test izolyatsiyasi.** Har bir test fayli bazani noldan quradi (`dropSchema + synchronize`), testlar `--runInBand`
(ketma-ket) ishlaydi, shuning uchun bir-biriga halaqit bermaydi. *Production'da `synchronize` hech qachon ishlatilmaydi — migratsiya ishlatiladi
(buni Modul 02 va 30 da ko'ramiz).*

---

## 2. ServiceHub — maqsadli arxitektura

**ServiceHub — Multi-Branch Service Booking Platform.** Filiallar tarmog'i (salon, servis, klinika…): mijoz xizmatni bron qiladi, xodim bajaradi.

### 2.1 Rollar

| Rol | Imkoniyatlar (qisqacha) |
|-----|-------------------------|
| `CUSTOMER` | Bron yaratish/bekor qilish, to'lov, sharh qoldirish |
| `STAFF` | O'z jadvalini ko'rish, bronni bajarilgan deb belgilash |
| `MANAGER` | O'z filiali xodimlari, xizmatlari, bronlari, hisobotlar |
| `ADMIN` | Butun tizim, audit loglar, global sozlamalar |

### 2.2 Modullar va mas'uliyatlar

| Modul | Mas'uliyat | Asosiy mavzular |
|-------|-----------|-----------------|
| Auth | Login, JWT, refresh | 06, 27 |
| Users | Foydalanuvchi profili, rollar | 02, 06 |
| Staff | Xodim profili, qaysi xizmatlarni ko'rsata olishi (M:N) | 02 |
| Branches | Filiallar | 02 |
| Services | Filial xizmatlari: narx, davomiylik | 02, 03 |
| Bookings | Bron hayot sikli: `PENDING → CONFIRMED → COMPLETED / CANCELLED` | 15 (State), 04, 23 |
| Availability | Bo'sh vaqt oynalarini hisoblash | 03, 16 (Specification), 22 |
| Payments | To'lov provayderi (mock) | 13 (Adapter), 26 (idempotency) |
| Notifications | Email/SMS navbatda yuborish | 25 (BullMQ), 21 |
| Reviews | Sharhlar, reyting | 02, 03 |
| Reports | Daromad, band qilinganlik | 22, 24, 29 |
| Audit Logs | Muhim amallar izi | 21 (events), 26 (outbox) |

### 2.3 Tanlangan arxitektura: **Modular Monolith**

Nega mikroservis emas? Jamoa kichik, domen hali o'rganilmoqda, tarmoq xatolari va distributed transaction murakkabligi hozircha foyda bermaydi.
Modular monolit — bitta deploy, lekin modullar orasida **aniq chegaralar** (faqat public API orqali muloqot). Kerak bo'lsa keyin ajratib olinadi.

```text
 HTTP ─► [Controller] ─► [Application Service] ─► [Domain] ◄─ [Repository interface]
                                  │                                      ▲
                                  ├─► [Payment Port] ◄─ Mock/Stripe Adapter
                                  ├─► [Event Bus] ─► Notifications (BullMQ), Audit
                                  └─────────────────────────────────────┘
                                          Infrastructure: TypeORM, Redis, BullMQ
```

### 2.4 Asosiy biznes qoidalari va ularni qanday ta'minlaymiz

| Qoida | Mexanizm |
|-------|----------|
| Xodimning bronlari **bir-biriga kesishmaydi** | DB darajasida: PostgreSQL `EXCLUDE USING gist` (tstzrange) yoki lock + tranzaksiya; ilova darajasida: tekshiruv |
| Parallel bron'da **race condition yo'q** | Tranzaksiya + pessimistic lock / constraint (mavzu 23) |
| Status o'tishlari faqat ruxsat etilganlari | State pattern (mavzu 15) |
| To'lov provayderini almashtirish oson | Adapter + DI token (mavzu 13) |
| Bildirishnoma bron'ni sekinlashtirmaydi | BullMQ + Outbox (25, 26) |
| Muhim amallar yoziladi | Domain event → Audit handler |
| Har bir filial faqat o'z ma'lumotini ko'radi | RBAC + ownership/branch scope (mavzu 06) |

### 2.5 Maqsadli papka tuzilmasi (reja)

```text
servicehub/src/
├── main.ts
├── app.module.ts
├── common/            ← filter, interceptor, decorator'lar
├── config/            ← typed configuration
├── modules/
│   ├── auth/
│   ├── users/
│   ├── staff/
│   ├── branches/
│   ├── services/
│   ├── bookings/
│   │   ├── domain/            ← entity, status mashinasi, domain event
│   │   ├── application/       ← use-case/service
│   │   ├── infrastructure/    ← TypeORM repository
│   │   └── presentation/      ← controller, DTO
│   ├── availability/
│   ├── payments/              ← port + adapters
│   ├── notifications/
│   ├── reviews/
│   ├── reports/
│   └── audit-logs/
└── database/migrations/
```

> Bu struktur **qat'iy emas**: aniq qatlamlarga (domain/application/…) bo'lish faqat Phase 3 da, haqiqatan kerak bo'lgan modullarda qo'llaniladi.
> Oddiy modul (masalan, Branches) oddiy CRUD bo'lib qolishi mumkin — ortiqcha murakkablik taqiqlanadi.
