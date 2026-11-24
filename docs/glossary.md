# Lug'at (Glossary)

Texnik atamalar inglizcha qoldirilgan; ma'nosi o'zbekcha izohlangan. Yangi mavzular o'tilgan sari to'ldirib boriladi.

## Umumiy

| Atama | Izoh |
|-------|------|
| **Abstraction** | Murakkab tafsilotni yashirib, sodda interfeys berish |
| **Coupling (bog'liqlik)** | Bir qism boshqasiga qanchalik qattiq bog'langani. Kam bo'lgani yaxshi |
| **Cohesion (jipslik)** | Bir modul ichidagi narsalar qanchalik bir maqsadga xizmat qilishi. Yuqori bo'lgani yaxshi |
| **Side effect** | Funksiyaning qaytaradigan qiymatidan tashqari ta'siri (DB'ga yozish, log, email) |
| **Contract (shartnoma)** | Qism nima qilishi *kerakligi* haqidagi kelishuv (interfeys, test) — qanday qilishi emas |
| **Idempotent** | Bir amalni bir necha marta bajarish natijasi bir marta bajarilgandek bo'lishi |

## Repository va ma'lumotlar bazasi (Modul 01+)

| Atama | Izoh |
|-------|------|
| **Repository** | Ma'lumotni saqlash/olishni "kolleksiya" kabi ko'rsatadigan qatlam; SQL tafsilotini yashiradi |
| **Entity** | Bazadagi jadvalga mos keladigan klass (TypeORM `@Entity`) |
| **Query Builder** | SQL'ni kod orqali bosqichma-bosqich, parametrlar bilan qurish usuli |
| **Parameterized query** | Qiymatlar SQL matniga qo'shilmay, alohida parametr sifatida yuboriladi → SQL injection'dan himoya |
| **SQL Injection** | Foydalanuvchi kiritgan matn SQL buyrug'i sifatida bajarilishi hujumi |
| **Transaction** | Bir nechta amalni "yoki hammasi, yoki hech biri" qilib bajarish |
| **ACID** | Atomicity, Consistency, Isolation, Durability — tranzaksiya kafolatlari |
| **Rollback** | Tranzaksiyani bekor qilib, o'zgarishlarni qaytarish |
| **Constraint** | Bazadagi qoida: `UNIQUE`, `NOT NULL`, `CHECK`, `FOREIGN KEY` |
| **Race condition** | Natija parallel jarayonlarning tasodifiy tartibiga bog'liq bo'lib qolishi |
| **Deadlock** | Ikki tranzaksiya bir-birining qulfini kutib qotib qolishi; PostgreSQL birini bekor qiladi |
| **Row lock** | Qatorga vaqtincha yozishni bloklash (`UPDATE`, `SELECT … FOR UPDATE`) |
| **`numeric`** | PostgreSQL'ning aniq o'nlik turi (pul uchun). Node `pg` drayveri uni **string** qaytaradi |
| **`ILIKE`** | Katta-kichik harfga befarq `LIKE` (PostgreSQL) |
| **Wildcard** | `LIKE` da maxsus belgilar: `%` (istalgan matn), `_` (bitta belgi) |
| **Aggregate** | `COUNT`, `SUM`, `AVG` kabi bir nechta qatordan bitta qiymat hisoblovchi funksiya |
| **N+1** | 1 ta asosiy so'rov + N ta qo'shimcha so'rov muammosi (Modul 02) |

## NestJS

| Atama | Izoh |
|-------|------|
| **Provider** | DI orqali berilishi mumkin bo'lgan klass/qiymat (service, repository, factory) |
| **Injection Token** | Provider'ni aniqlovchi kalit: klass, `string` yoki `Symbol`. Interfeys runtime'da yo'q, shuning uchun token kerak |
| **DI (Dependency Injection)** | Bog'liqliklarni klass o'zi yaratmay, tashqaridan olishi |
| **`TestingModule`** | Test uchun kichik NestJS konteyneri (`Test.createTestingModule`) |
| **`useClass` / `useValue` / `useFactory`** | Provider'ni qanday yaratishni belgilash usullari |
| **Pipe** | Kiruvchi qiymatni o'zgartiradi yoki tekshiradi (`ValidationPipe`, `ParseUUIDPipe`) |
| **DTO** | Data Transfer Object — tashqaridan keladigan/ketadigan ma'lumot shakli |

## Testlash

| Atama | Izoh |
|-------|------|
| **Unit test** | Bitta birlikni (service) tashqi tizimlarsiz sinash |
| **Integration test** | Bir nechta qism (service + haqiqiy DB) birgalikda ishlashini sinash |
| **E2E test** | Tizimni foydalanuvchi nuqtai nazaridan (HTTP) boshidan oxirigacha sinash |
| **Fake** | Haqiqiy narsaning sodda, ishlaydigan o'rinbosari (in-memory repository) |
| **Mock / Spy** | Chaqiruvlarni kuzatadigan/boshqaradigan soxta obyekt (`jest.fn`, `jest.spyOn`) |
| **Mutation check** | Kodga ataylab xato kiritib, testlar uni ushlashini tekshirish |
| **Flaky test** | Ba'zan o'tadigan, ba'zan yiqiladigan beqaror test |

## Arxitektura (keyingi bosqichlar uchun oldindan)

| Atama | Izoh |
|-------|------|
| **SOLID** | 5 ta dizayn tamoyili (SRP, OCP, LSP, ISP, DIP) |
| **DIP** | Dependency Inversion: yuqori daraja modul quyi darajaga emas, abstraksiyaga tayanadi |
| **Clean / Hexagonal Architecture** | Biznes mantiq markazda, tashqi texnologiyalar (DB, HTTP) chetda va almashtiriladigan |
| **Bounded Context** | Bir model (atamalar) amal qiladigan aniq chegara |
| **CQRS** | Command (yozish) va Query (o'qish) modellarini ajratish |
| **Modular Monolith** | Bitta deploy, ichida aniq chegarali modullar |
