# Topshiriq 01 — «OmborHub»: mini-market ombori

**Qiyinlik:** Medium · **Taxminiy vaqt:** 3–6 kun · **Mavzu:** Repository Pattern, Query Builder, Tranzaksiya, Unit/Integration/E2E

> ⚠️ Yechim berilmaydi. Siz entity, DTO, repository, service, controller va modulni **o'zingiz** yozasiz.
> Testlar tayyor (`tests/`) — ularni **o'zgartirmang**.

---

## 1. Vaziyat

Siz **«Bozorcha»** nomli Toshkentdagi mini-marketlar tarmog'i uchun ombor tizimini yozmoqdasiz.
Hozir hisob Excel'da yuritiladi, natijada ikkita katta muammo bor:

1. **Kassirlar bir vaqtda bir xil tovarni sotadi** — Excel'da oxirgi 1 dona sut ikki marta sotilib, zaxira «−1» ga tushib ketadi.
2. **Xaridor 5 xil mahsulot sotib oladi, 4 tasi hisobdan chiqadi, 5-si tugab qolgan bo'ladi** — natijada hisob buziladi: chek ham yo'q, zaxira ham yarim-yorti.

Ombor menejeri esa ertalab «nimani buyurtma qilish kerak?» ro'yxatini va kategoriyalar bo'yicha qoldiq qiymatini ko'rmoqchi.

Sizning vazifangiz — shu muammolarni yechadigan, **to'g'ri qatlamlarga ajratilgan** NestJS moduli.

---

## 2. Funksional talablar

### 2.1 Mahsulot
Har bir mahsulot: `id` (UUID), `sku` (unikal), `name`, `category`, `price`, `quantity` (omborda qancha), `reorderLevel` (nechtadan kamaysa buyurtma kerak; standart `5`), `isActive` (standart `true`), `createdAt`.

### 2.2 Imkoniyatlar

| # | Imkoniyat | Qisqacha |
|---|-----------|----------|
| F1 | Mahsulot qo'shish | SKU band bo'lsa — xato |
| F2 | Mahsulotni ID bo'yicha ko'rish | Topilmasa — xato |
| F3 | Mahsulotlarni qidirish va filtrlash | nom/SKU bo'yicha qidiruv, kategoriya, narx oralig'i, nofaollarni ham ko'rsatish |
| F4 | **Qayta buyurtma hisoboti** | Zaxirasi `reorderLevel` ga yetgan yoki undan kam mahsulotlar va nechta buyurtma qilish tavsiyasi |
| F5 | **Kategoriya statistikasi** | Har bir kategoriya bo'yicha mahsulotlar soni, jami zaxira, jami qiymat |
| F6 | **Sotuv (savat)** | Bir nechta mahsulotni birdaniga sotish. **Yoki hammasi, yoki hech biri.** Parallel so'rovlarda zaxira manfiy bo'lmaydi |

### 2.3 Qoidalar (batafsil)

**Qidiruv (F3)** — `search`:
- Filtrsiz so'ralsa → faqat **faol** (`isActive = true`) mahsulotlar.
- `includeInactive = true` → nofaollar ham qo'shiladi.
- `search` — nom **yoki** SKU ichida, **katta-kichik harfga befarq** qismiy moslik.
  `%` va `_` belgilari **oddiy belgi** sifatida qidiriladi (masalan, `"50%"` qidirsangiz faqat shu matn bor mahsulotlar chiqadi, hammasi emas).
- `category` — aniq moslik.
- `minPrice`/`maxPrice` — chegaralar **kiradi** (`>=`, `<=`). Ikkalasi ixtiyoriy va alohida ishlaydi.
- Barcha filtrlar birga — `AND`.
- Tartib: `name` A→Z, so'ng `sku` A→Z.

**Qayta buyurtma (F4):**
- Faqat faol mahsulotlar, `quantity <= reorderLevel` (ikki **ustun** bir-biri bilan taqqoslanadi).
- Tartib: `quantity` o'sish bo'yicha, so'ng `name`.
- Har bir element uchun `suggestedOrder = reorderLevel * 2 - quantity`.
- Javob: `{ count, items: [{ sku, name, quantity, reorderLevel, suggestedOrder }] }`.

**Kategoriya statistikasi (F5):**
- Faqat faol mahsulotlar, `category` A→Z.
- `{ category, productCount, totalQuantity, totalValue }` — hammasi **number** (string emas!). `totalValue = Σ(price × quantity)`.

**Sotuv (F6):**
- Kirish: `{ items: [{ sku, quantity }, ...] }`.
- Tekshiruvlar (HTTP **400**, repository chaqirilmaydi): ro'yxat bo'sh; takroriy SKU; `quantity` butun musbat son emas.
- Noma'lum yoki nofaol SKU → **404**.
- Zaxira yetmasa → **409**; hech narsa o'zgarmaydi (**atomiklik**).
- Muvaffaqiyatda **201**: `{ total, lines: [{ sku, quantity, unitPrice, lineTotal }] }`, qatorlar kiritilgan tartibda. Summalar **tiyin aniqligida** (`0.10 × 3 = 0.3`, `0.30000000000000004` emas).
- Zaxirani aynan **0 gacha** sotish mumkin.
- Parallel: zaxira 3 ta bo'lsa-yu 6 ta kassir 1 donadan sotmoqchi bo'lsa — aynan 3 tasi o'tadi, qolgani 409, zaxira manfiy bo'lmaydi.

---

## 3. Texnik talablar

1. **Qatlamlar:** Controller → `InventoryService` → `IProductRepository` (interfeys) → `TypeOrmProductRepository`.
2. **Service TypeORM'ni bilmasligi kerak** — faqat `IProductRepository` interfeysiga tayanadi (`@Inject(PRODUCT_REPOSITORY)`).
   Unit testlar service'ni TypeORM'siz, soxta repository bilan sinaydi.
3. **Repository HTTP'ni bilmasligi kerak** — `HttpException` tashlamaydi, **domen xatolari** tashlaydi. Service ularni HTTP xatolariga o'giradi.
4. Service **kutilmagan xatoni** (masalan, baza uzilishi) `4xx` ga o'girmasdan **o'zini** qaytaradi.
5. `price` — bazada `numeric(12,2)`, JS'da `number`.
6. Bazaning o'zi himoyalangan bo'lsin: **SKU unikal**, `quantity` manfiy bo'la olmaydi (**CHECK constraint**).
7. Dinamik filtrlar va hisobotlar — **Query Builder** bilan.
8. Sotuv — bitta **tranzaksiya** ichida. Parallel xavfsizlik uchun «o'qi → tekshir → yoz» emas, **atomik** usul.
9. DTO validatsiya: `class-validator` + `class-transformer`. Controller'da `ValidationPipe` testlarda global yoqiladi (`whitelist`, `forbidNonWhitelisted`, `transform`).
10. TypeScript `strict` rejimi.

---

## 4. Shartnoma (testlar shuni import qiladi)

Hamma fayl `modules/01-repository-pattern/src/products/` ichida. **Nomlar va imzolar aniq shunday bo'lishi kerak.** Ichki implementatsiya — sizniki.

| Fayl | Nimani eksport qiladi |
|------|----------------------|
| `product.entity.ts` | `class Product` — jadval nomi **`products`**; maydonlari: `id, sku, name, category, price, quantity, reorderLevel, isActive, createdAt` |
| `errors.ts` | `class ProductNotFoundError(sku)`, `class InsufficientStockError(sku, requested, available)` — hammasi `Error`'dan meros; konstruktor argumentlari **o'sha nomli public maydon**larda saqlansin (`err.sku`, `err.requested`, `err.available`) |
| `product.repository.interface.ts` | `PRODUCT_REPOSITORY` (token), `IProductRepository`, `NewProduct`, `ProductFilter`, `CategoryStat`, `StockItem` |
| `typeorm-product.repository.ts` | `class TypeOrmProductRepository implements IProductRepository` |
| `inventory.service.ts` | `class InventoryService` |
| `products.module.ts` | `class ProductsModule` — controller'lar, service, repository, `TypeOrmModule.forFeature`; **exports**: `InventoryService`, `PRODUCT_REPOSITORY` |
| (controller, DTO) | Nomi va joyi erkin — faqat HTTP shartnomasi (6-bo'lim) muhim |

### Tiplar

```ts
interface NewProduct   { sku: string; name: string; category: string; price: number;
                         quantity: number; reorderLevel?: number; isActive?: boolean }
interface ProductFilter{ search?: string; category?: string; minPrice?: number;
                         maxPrice?: number; includeInactive?: boolean }
interface CategoryStat { category: string; productCount: number; totalQuantity: number; totalValue: number }
interface StockItem    { sku: string; quantity: number }
```

### `IProductRepository`

```ts
create(data: NewProduct): Promise<Product>;
findById(id: string): Promise<Product | null>;
findBySku(sku: string): Promise<Product | null>;
search(filter: ProductFilter): Promise<Product[]>;
findLowStock(): Promise<Product[]>;
getCategoryStats(): Promise<CategoryStat[]>;
decrementStockMany(items: StockItem[]): Promise<Product[]>;   // atomik; yangilangan mahsulotlar, kiritilgan tartibda
```

`decrementStockMany` — yo'q sku/nofaol → `ProductNotFoundError(sku)`; yetmasa → `InsufficientStockError(sku, requested, available)`; xato bo'lsa **hech narsa o'zgarmaydi**.

### `InventoryService`

```ts
registerProduct(dto: NewProduct): Promise<Product>
getProduct(id: string): Promise<Product>
listProducts(filter: ProductFilter): Promise<Product[]>      // filterni o'zgartirmasdan repository'ga uzatadi
getRestockReport(): Promise<{ count: number; items: {...}[] }>
getCategoryStats(): Promise<CategoryStat[]>
sell(dto: { items: StockItem[] }): Promise<{ total: number; lines: {...}[] }>
```

---

## 5. Xatolar jadvali

| Holat | Repository | Service | HTTP |
|-------|-----------|---------|------|
| SKU band | (bazadan xato) | `ConflictException` | 409 |
| Mahsulot topilmadi (ID) | `null` | `NotFoundException` | 404 |
| Sotuvda noma'lum SKU | `ProductNotFoundError` | `NotFoundException` | 404 |
| Zaxira yetmaydi | `InsufficientStockError` | `ConflictException` | 409 |
| Noto'g'ri sotuv kirishi | — | `BadRequestException` | 400 |
| Boshqa xato | tashlanadi | **o'zgarishsiz** tashlanadi | 500 |

## 6. HTTP shartnomasi

| Metod va yo'l | Tavsif | Muvaffaqiyat |
|---------------|--------|--------------|
| `POST /products` | Body: `sku, name, category, price, quantity, reorderLevel?` | 201 + mahsulot |
| `GET /products` | Query: `search, category, minPrice, maxPrice, includeInactive` | 200 + massiv |
| `GET /products/:id` | `id` — UUID bo'lmasa 400 | 200 + mahsulot |
| `GET /reports/restock` | | 200 + `{count, items}` |
| `GET /reports/categories` | | 200 + massiv |
| `POST /sales` | Body: `{ items: [{sku, quantity}] }` | 201 + `{total, lines}` |

Validatsiya (400): bo'sh `sku/name/category`; `price < 0` yoki raqam emas; `quantity` manfiy/kasr; `reorderLevel` manfiy; ruxsat etilmagan maydon; `minPrice=abc`; sotuvda `items` yo'q/bo'sh, `quantity < 1`, `sku` yo'q.

---

## 7. Qabul mezonlari (Acceptance Criteria)

- [ ] `npm run test:m01` — **barcha majburiy testlar o'tdi** (unit + integration + e2e).
- [ ] `npm run typecheck` xatosiz.
- [ ] Service'da **`typeorm` importi yo'q**.
- [ ] Repository'da **`@nestjs/common` dagi `HttpException` turlari yo'q**.
- [ ] Hamma SQL qiymatlari parametrlashtirilgan (string birlashtirish yo'q).
- [ ] Sotuv bitta tranzaksiyada, tranzaksiya ichida faqat `manager` ishlatilgan.
- [ ] Menga o'z kodingizni **review** uchun yuboring (men arxitektura, xavfsizlik va performance bo'yicha fikr bildiraman).

*Ixtiyoriy:* `npm run test:m01:bonus` (pastda «Qo'shimcha vazifalar»).

---

## 8. Ishni qayerdan boshlash (tavsiya etilgan tartib)

```bash
npm install && npm run db:up        # bir marta
npm run test:m01                    # hammasi qizil bo'ladi — bu NORMAL ("Cannot find module ...")
```

Testlar fayl topilmagani uchun yiqiladi. Kichik-kichik qadam bilan yuring:

1. `errors.ts`, `product.entity.ts`, `product.repository.interface.ts` ni yozing.
2. **Unit testlar** (`inventory.service.spec.ts`) — `InventoryService` + `ProductsModule` skeleti (bazasiz, tez).
   Unit test faqat 1–2 faylga tayanadi, shu bilan boshlash qulay: `npx jest modules/01-repository-pattern/tests/inventory.service.spec.ts`
3. `TypeOrmProductRepository` — metodma-metod, integration test bilan: `npx jest --runInBand product.repository`
4. Controller + DTO, so'ng E2E: `npx jest --runInBand e2e`
5. Hammasi: `npm run test:m01`

> Testda biror yiqilsa, avval xato matnini **diqqat bilan o'qing** — u odatda nima kutilgani va nima kelganini aytadi.
> Tushunmasangiz — menga xato matni va tegishli kodni yuboring; men avval **sababini** tushuntiraman.

---

## 9. Progressiv hintlar

Hintlarni **ketma-ket** oching. Avval o'zingiz urinib ko'ring — 20–30 daqiqa qotib qolsangina keyingisini oching.

### A. Entity va constraint'lar

<details><summary>Hint 1 — muammo</summary>

Testlar ko'rsatadi: baza `price` ni oddiy ustun qilsangiz `"19.99"` (string) qaytaradi, takroriy SKU yoki manfiy zaxira kodingiz tekshirmasa ham bazaga kirib ketishi mumkin. Entity — faqat maydonlar emas, **qoidalar** ham.
</details>
<details><summary>Hint 2 — tushunchalar</summary>

`@Column({ type: 'numeric', precision, scale, transformer })`, `unique`, `@Check(...)` (TypeORM), `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn`, `default` qiymatlar.
</details>
<details><summary>Hint 3 — yo'nalish</summary>

`transformer` ikki yo'nalishda ishlaydi: **to** (JS → DB) va **from** (DB → JS). Muammo `from` tomonida. `@Check` ga SQL ifoda beriladi va ustun nomi qo'shtirnoq ichida yoziladi (PostgreSQL katta-kichik harfga sezgir nomlar uchun).
</details>
<details><summary>Hint 4 — qadamlar</summary>

1. `price` uchun `from` da stringni songa o'giradigan transformer.
2. `sku` ga `unique: true`.
3. Klass ustida `quantity` manfiy emasligini tekshiradigan `@Check`.
4. Test `synchronize` bilan jadvalni yaratadi — constraint ishlamasa, SQL logini yoqib (`logging: true`, vaqtincha) hosil bo'lgan `CREATE TABLE` ni ko'ring.
</details>

### B. Service va domen xatolari

<details><summary>Hint 1 — muammo</summary>

Service HTTP xatolarini (409/404/400) tashlaydi, repository esa HTTP'ni bilmaydi. Ularni bog'laydigan joy — service.
</details>
<details><summary>Hint 2 — tushunchalar</summary>

Interfeys + `Symbol` token, `@Inject(TOKEN)`, `instanceof` bilan xato turini aniqlash, `try/catch` va **qayta tashlash**.
</details>
<details><summary>Hint 3 — yo'nalish</summary>

`sell()` tartibi: (1) kirishni tekshir → (2) repository'ni chaqir → (3) kutilgan domen xatolarini o'gir, boshqasini o'zgarishsiz tashla → (4) natijadan chek yasa. Narx va zaxirani repository qaytargan **yangilangan** mahsulotlardan olasiz.
</details>
<details><summary>Hint 4 — qadamlar</summary>

1. Takroriy SKU'ni tekshirish: `Set` o'lchamini ro'yxat uzunligi bilan solishtiring.
2. `Number.isInteger` va `> 0`.
3. Yaxlitlash: `Math.round(x * 100) / 100` — **qayerda** qo'llash kerakligini o'ylang (har qator uchun ham, jami uchun ham).
4. `catch (e)` ichida avval `instanceof` tekshirib, oxirida `throw e`.
</details>

### C. Query Builder: `search`, `findLowStock`, `getCategoryStats`

<details><summary>Hint 1 — muammo</summary>

Filtrlar ixtiyoriy: ba'zan 0 ta, ba'zan 5 ta shart. Ustun-ustun taqqoslash (`quantity <= reorderLevel`) va agregat (`SUM(price * quantity)`) `find()` bilan ifodalanmaydi.
</details>
<details><summary>Hint 2 — tushunchalar</summary>

`createQueryBuilder(alias)`, `andWhere`, shartli qo'shish (`if`), `ILIKE`, `GROUP BY`, `select/addSelect(..., alias)`, `getRawMany`, `orderBy/addOrderBy`.
</details>
<details><summary>Hint 3 — yo'nalish</summary>

- `%` va `_` ni oddiy belgi qilish: foydalanuvchi matnidagi `\`, `%`, `_` oldiga `\` qo'ying va SQL'da `ESCAPE` bildiring. Tartib muhim: avval `\` ni, keyin qolganini.
- Agregat natijalar `getRawMany()` da string keladi (`bigint`/`numeric`).
- Ustun nomlari: QB'da entity xossasi (`p.isActive`) ishlaydi, lekin **raw `where` matnida** ba'zan haqiqiy ustun nomi kerak — xato matniga qarang.
</details>
<details><summary>Hint 4 — qadamlar</summary>

1. `search`: boshlang'ich QB → `if (!includeInactive)` → `if (search)` (nom OR SKU, qavs ichida!) → kategoriya → narxlar → tartib.
2. Narx tekshiruvida `if (minPrice)` emas, `!== undefined` — nega? (`minPrice = 0` bilan nima bo'ladi?)
3. `findLowStock`: `p.quantity <= p.reorderLevel`.
4. `getCategoryStats`: `COUNT(*)`, `SUM(p.quantity)`, `SUM(p.price * p.quantity)`; natijani `Number(...)` bilan map qiling.
</details>

### D. `decrementStockMany` — tranzaksiya va atomiklik

<details><summary>Hint 1 — muammo</summary>

Ikki xavf: (1) 3-mahsulot yetmasa, 1–2-mahsulot allaqachon kamaygan bo'lib qoladi; (2) ikki kassir bir vaqtda oxirgi donani «o'qib», ikkalasi ham sotadi.
</details>
<details><summary>Hint 2 — tushunchalar</summary>

`DataSource.transaction(cb)` va callback'dagi `manager`, atomik `UPDATE ... WHERE shart`, `RETURNING`, qatorlar bloklanishi, deadlock.
</details>
<details><summary>Hint 3 — yo'nalish</summary>

Ro'yxatni «tekshirib so'ng yozish» o'rniga har bir element uchun **bitta `UPDATE`** ishlating, uning `WHERE` qismi zaxira yetarliligini ham tekshirsin. Nechta qator o'zgargani (yoki `RETURNING`) sizga «o'tdimi yo'qmi» deydi. Agar 0 qator o'zgargan bo'lsa — sabab ikkita bo'lishi mumkin: mahsulot yo'q **yoki** zaxira yetmaydi. Farqlash uchun yana bitta so'rov kerak.
</details>
<details><summary>Hint 4 — qadamlar</summary>

1. `this.dataSource.transaction(async (manager) => { ... })` — ichida faqat `manager`.
2. Har element uchun QB: `update(Product).set({ quantity: () => '"quantity" - :q' })` yoki shunga o'xshash ifoda; parametrlarni `setParameters`/`where` orqali bering. Qiymatni ifoda matniga **qo'shib** yubormang.
3. 0 qator → mahsulotni qayta o'qib, `ProductNotFoundError` yoki `InsufficientStockError`ni tashlang → tranzaksiya avtomatik rollback.
4. Oxirida har bir sku'ning yangilangan holatini **kiritilgan tartibda** qaytaring.
5. (Bonus uchun) Qatorlarni bloklash tartibi haqida o'ylang.
</details>

### E. Controller, DTO, Module

<details><summary>Hint 1 — muammo</summary>

Query-string'dan hamma narsa **string** bo'lib keladi: `minPrice=6` → `"6"`, `includeInactive=false` → `"false"`.
</details>
<details><summary>Hint 2 — tushunchalar</summary>

`class-validator` dekoratorlari, `class-transformer` `@Type`, `@Transform`, ichma-ich DTO (`@ValidateNested` + `@Type`), `ParseUUIDPipe`, `ValidationPipe({ transform: true })`.
</details>
<details><summary>Hint 3 — yo'nalish</summary>

⚠️ Klassik tuzoq: `@Type(() => Boolean)` `"false"` ni **`true`** ga aylantiradi (bo'sh bo'lmagan satr = truthy). Boolean query uchun `@Transform` bilan o'zingiz o'giring.
</details>
<details><summary>Hint 4 — qadamlar</summary>

1. `CreateProductDto`, `ProductQueryDto`, `SellDto` (+ ichki `SellItemDto`).
2. Controller metodlari faqat service'ni chaqiradi — mantiq yo'q.
3. `ProductsModule`: `imports: [TypeOrmModule.forFeature([Product])]`, `providers: [..., { provide: PRODUCT_REPOSITORY, useClass: ... }]`, `exports`.
</details>

---

## 10. Qo'shimcha vazifalar (ixtiyoriy)

`npm run test:m01:bonus` — 2 ta bonus test:

1. **Deadlock:** 20 ta parallel sotuv, yarmi `[A, B]`, yarmi `[B, A]` tartibida — hammasi muvaffaqiyatli o'tishi kerak. *Savol: nega majburiy testlarda bu yo'q, lekin production'da muhim? Qatorlarni qanday tartibda bloklash deadlock'ni oldini oladi?*
2. **Race on create:** bir xil SKU bilan 8 ta parallel `registerProduct` — bittasi muvaffaqiyatli, qolganlari **409** (500 emas!).
   *Maslahat: «avval tekshir, keyin yarat» (check-then-act) bu yerda ham race. Bazaning unikal constraint'i xato beradi — uni **domen xatosiga** o'giring (PostgreSQL xato kodi `23505`).*

Yana (testsiz, o'zingiz uchun):
3. `getCategoryStats` uchun `HAVING` bilan «kamida N ta mahsuloti bor kategoriyalar» qo'shing.
4. `SELECT ... FOR UPDATE` (pessimistic lock) yondashuvi bilan `decrementStockMany` ni qayta yozing va ikkala usulni taqqoslang: qaysi biri qachon yaxshi?
5. `EXPLAIN ANALYZE` bilan `search` so'rovini ko'ring: `category` bo'yicha indeks yordam beradimi?

---

## 11. Topshirish tartibi

1. `npm run test:m01` — chiqishini (yashil bo'lsa) menga yuboring.
2. Kodingiz (yoki GitHub/diff) — review uchun.
3. Men tekshiraman va `PROGRESS.md` ni yangilayman. **Faqat shundan keyin** Modul 02 (Entity Relations) boshlanadi.

Omad! 💪
