# Modul 01 — Repository Pattern

> **Bu modulda:** ma'lumotlar bazasi bilan ishlashni biznes mantiqdan ajratishni, TypeORM Query Builder'ni,
> interfeys + DI token orqali bog'liqlikni boshqarishni, tranzaksiyani va repository'ni testlashni o'rganasiz.

**Prerequisite:** NestJS Provider/DI, TypeORM Entity, asosiy SQL.
**Keyin:** [`assignment.md`](assignment.md) — amaliy topshiriq (testlar `tests/` da tayyor).

Bu hujjatdagi misollar **Kutubxona (Book/Loan)** domeni bilan. Topshiriq esa **ombor (Inventory)** domenida — shuning uchun misollarni nusxalab yechim yozib bo'lmaydi; tushunchani o'zingiz qo'llashingiz kerak.

---

## 1. Oddiy tushuntirish

**Repository** — ma'lumotlarni saqlash va olish uchun *yagona kirish eshigi*. Qolgan kod (service) shunday gapiradi:

> "Menga SKU'si `A-1` bo'lgan mahsulotni ber" — **qanday** olinishini (SQL? Redis? fayl?) bilmaydi va bilishi shart emas.

Ya'ni repository ma'lumotni **xotiradagi obyektlar kolleksiyasi** kabi ko'rsatadi: `add`, `findBySku`, `search`...
SQL, `JOIN`, `ILIKE`, tranzaksiya tafsilotlari repository ichida qoladi.

## 2. Hayotiy analogiya

**Restoran.** Ofitsiant (service) mijozdan buyurtma oladi va oshxonaga (repository) aytadi: "Bitta osh".
Ofitsiant **go'sht qayerdan olinishini, qaysi pichoq ishlatilishini** bilmaydi. Oshxona (bazaviy ombor, muzlatgich) o'zgarsa ham ofitsiant ishi o'zgarmaydi.
Agar ofitsiant o'zi omborga kirib go'sht kesa boshlasa — bu **Repository'siz kod**: har bir ofitsiant har xil ishlaydi, tartib yo'q, almashtirish qiyin.

## 3. Nima uchun kerak?

Repository'siz tipik "boshlang'ich" service:

```ts
@Injectable()
export class BookService {
  constructor(@InjectRepository(Book) private books: Repository<Book>) {}

  async findAvailable(search: string) {
    return this.books
      .createQueryBuilder('b')
      .where('b.copies > 0')
      .andWhere('b.title ILIKE :s', { s: `%${search}%` })
      .orderBy('b.title')
      .getMany();            // <-- service SQL bilan "ifloslandi"
  }
}
```

Muammolar:

1. **Service ikkita ishni qiladi:** biznes qoida + SQL yozish (SRP buziladi).
2. **Testlash qiyin:** service'ni sinash uchun TypeORM'ning `Repository`/`QueryBuilder` zanjirini mock qilish kerak — `createQueryBuilder().where().andWhere()...` zanjirini mock qilish og'riqli va mo'rt.
3. **Takrorlanish:** "mavjud kitoblar" sharti 5 ta service'da nusxalanadi. Qoida o'zgarsa — 5 joyni tuzatish.
4. **Almashtirish qiyin:** keyin keshlash qo'shsangiz yoki boshqa manbaga o'tsangiz, hamma service o'zgaradi.

## 4. Qanday muammolarni hal qiladi?

| Muammo | Repository qanday hal qiladi |
|--------|------------------------------|
| SQL hamma joyga sochilgan | So'rovlar bir joyda, **biznes tilida** nomlangan: `findOverdueLoans()` |
| Testlash qiyin | Service interfeysga tayanadi → testda oddiy fake/mock beriladi |
| Takroriy so'rovlar | Bitta metod, ko'p joyda qayta ishlatiladi |
| Texnologiyaga bog'lanib qolish | Interfeys ortida TypeORM ↔ boshqasi almashtiriladi |
| Tranzaksiya chalkashligi | Atomik amallar repository metodi ichida (yoki Unit of Work'da) yopiq |

---

## 5. Eng sodda NestJS misoli

**Qadam 1.** Entity:

```ts
@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() title: string;
  @Column({ type: 'int' }) copies: number;
}
```

**Qadam 2.** Repository (klass, interfeyssiz — eng sodda shakl):

```ts
@Injectable()
export class BookRepository {
  constructor(@InjectRepository(Book) private readonly orm: Repository<Book>) {}

  findAvailable(): Promise<Book[]> {
    return this.orm.find({ where: { copies: MoreThan(0) }, order: { title: 'ASC' } });
  }
}
```

**Qadam 3.** Service faqat repository bilan gaplashadi:

```ts
@Injectable()
export class BookService {
  constructor(private readonly books: BookRepository) {}
  listAvailable() { return this.books.findAvailable(); }
}
```

**Qadam 4.** Modul:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  providers: [BookRepository, BookService],
})
export class BooksModule {}
```

Bu allaqachon yaxshi: SQL service'dan chiqdi. Lekin service hali **konkret `BookRepository` klassiga** bog'langan. Keyingi bo'limda buni yaxshilaymiz.

---

## 6. Professional implementatsiya

### 6.1 Interfeys + Injection Token (Dependency Inversion)

Service **abstraksiyaga** tayanishi kerak, TypeORM'ga emas:

```ts
// book.repository.interface.ts
export interface BookSearch { title?: string; onlyAvailable?: boolean }

export interface IBookRepository {
  add(data: { title: string; copies: number }): Promise<Book>;
  findById(id: string): Promise<Book | null>;
  search(filter: BookSearch): Promise<Book[]>;
}

export const BOOK_REPOSITORY = Symbol('BOOK_REPOSITORY');
```

> **Nega `Symbol` (token)?** TypeScript `interface` kompilyatsiyadan keyin **yo'qoladi** (runtime'da mavjud emas).
> NestJS DI esa runtime'da ishlaydi — unga ishlatiladigan "kalit" kerak. Shu kalit — *injection token*.

Implementatsiya:

```ts
@Injectable()
export class TypeOrmBookRepository implements IBookRepository {
  constructor(@InjectRepository(Book) private readonly orm: Repository<Book>) {}

  add(data) { return this.orm.save(this.orm.create(data)); }
  findById(id: string) { return this.orm.findOne({ where: { id } }); }

  search(filter: BookSearch) {
    const qb = this.orm.createQueryBuilder('b');
    if (filter.onlyAvailable) qb.andWhere('b.copies > 0');
    if (filter.title) qb.andWhere('b.title ILIKE :t', { t: `%${filter.title}%` });
    return qb.orderBy('b.title', 'ASC').getMany();
  }
}
```

Service:

```ts
@Injectable()
export class BookService {
  constructor(@Inject(BOOK_REPOSITORY) private readonly books: IBookRepository) {}
}
```

Modul — token'ni konkret klassga bog'laymiz:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  providers: [
    BookService,
    { provide: BOOK_REPOSITORY, useClass: TypeOrmBookRepository },
  ],
  exports: [BOOK_REPOSITORY],
})
export class BooksModule {}
```

### 6.2 Query Builder — dinamik so'rov

`find()` oddiy shartlar uchun yetarli. Quyidagilar uchun **Query Builder** kerak:

- shartli (ixtiyoriy) filtrlar (`if (filter.x) qb.andWhere(...)`),
- ustun-ustun taqqoslash (`a.copies < a.minCopies`),
- agregatlar (`COUNT`, `SUM`, `GROUP BY`),
- `UPDATE ... SET x = x - 1` kabi **atomik** ifodalar.

```ts
// Agregat misoli: har bir janr bo'yicha kitoblar soni
async countByGenre() {
  const rows = await this.orm
    .createQueryBuilder('b')
    .select('b.genre', 'genre')
    .addSelect('COUNT(*)', 'total')
    .groupBy('b.genre')
    .getRawMany();                       // getRawMany: Entity emas, "xom" qatorlar

  return rows.map((r) => ({ genre: r.genre, total: Number(r.total) })); // <-- Number()! sababi 7.2 da
}
```

**Parametrlar (`:t`) — SHART.** Qiymatni SQL matniga qo'shmang:

```ts
// ❌ SQL INJECTION!
qb.where(`b.title = '${userInput}'`);
// ✅ Parametrlashtirilgan
qb.where('b.title = :t', { t: userInput });
```

### 6.3 Tranzaksiya

Bir nechta yozuv **birgalikda** o'zgarishi kerak bo'lsa ("yoki hammasi, yoki hech biri"):

```ts
async lendBooks(memberId: string, bookIds: string[]) {
  return this.dataSource.transaction(async (manager) => {
    // MUHIM: tranzaksiya ichida faqat `manager` ishlatiladi!
    for (const id of bookIds) {
      await manager.decrement(Book, { id }, 'copies', 1);
    }
    return manager.save(Loan, bookIds.map((bookId) => ({ memberId, bookId })));
  });
  // Callback ichida xato tashlansa -> avtomatik ROLLBACK. Muvaffaqiyatli tugasa -> COMMIT.
}
```

> ⚠️ **Eng ko'p xato:** tranzaksiya ichida `this.orm.save(...)` chaqirish. `this.orm` — **boshqa ulanish** (connection),
> u tranzaksiyaga kirmaydi! Faqat callback'dagi `manager` (yoki `queryRunner.manager`) ishlatiladi.

### 6.4 Domen xatolari vs HTTP xatolari

Repository `NotFoundException` (HTTP tushunchasi!) tashlamasligi kerak — u HTTP'ni bilmaydi.
U **domen xatosi** tashlaydi, service esa uni kerakli HTTP xatosiga o'giradi:

```ts
// repository (HTTP'dan bexabar)
export class BookOutOfStockError extends Error {
  constructor(public readonly bookId: string) { super(`Out of stock: ${bookId}`); }
}

// service (HTTP chegarasi)
try { await this.books.lend(...); }
catch (e) {
  if (e instanceof BookOutOfStockError) throw new ConflictException(e.message);
  throw e;               // kutilmagan xatoni "yutib" yubormang!
}
```

### 6.5 Testlash strategiyasi

| Nimani | Qanday | Nima uchun |
|--------|--------|------------|
| **Service** (biznes qoida) | Unit test: repository o'rniga fake/mock | Tez, bazasiz, qoidalarga e'tibor |
| **Repository** (SQL) | Integration test: haqiqiy PostgreSQL | Mock SQL to'g'riligini isbotlamaydi! |
| **Butun oqim** | E2E: HTTP → DB | Shartnoma (URL, status, JSON) |

```ts
// Unit: service interfeysga tayanganligi tufayli TypeORM umuman kerak emas
const moduleRef = await Test.createTestingModule({
  providers: [BookService, { provide: BOOK_REPOSITORY, useValue: fakeRepo }],
}).compile();
```

---

## 7. Ichki ishlash mexanizmlari

### 7.1 DI qanday ishlaydi

`@Inject(BOOK_REPOSITORY)` → Nest konteyneri token bo'yicha provider qidiradi → `useClass: TypeOrmBookRepository` topadi →
uning konstruktoridagi bog'liqliklarni (`Repository<Book>`) rekursiv hal qiladi → obyektni **bir marta** yaratadi (default scope: singleton).
Testda token boshqa qiymatga (`useValue: fake`) bog'lanadi — service kodi o'zgarmaydi. Mana shu **Dependency Inversion**.

### 7.2 PostgreSQL `numeric` → JavaScript `string`

`numeric`/`decimal` ustunlari (pul uchun to'g'ri tanlov: `float` da `0.1 + 0.2 = 0.30000000000000004`) Node `pg` drayveri
tomonidan **string** sifatida qaytariladi (`"19.99"`), chunki JS `number` (IEEE-754 double) aniqlikni yo'qotishi mumkin.
Shuningdek, `COUNT(*)` va `SUM(int)` natijalari `bigint` bo'lib, ular ham **string** keladi. Yechim: ustun uchun `transformer`
(`from`/`to`) yoki raw natijani `Number()` bilan o'girish. Bu "mayda" tafsilot production'da pul bilan bog'liq xatolarning katta manbai.

### 7.3 `find()` vs Query Builder

`find()`/`findOne()` ichkarida ham Query Builder yaratadi. Farq — ifoda kuchida: `find` deklarativ, lekin murakkab SQL'ni (ustun taqqoslash, agregat, `UPDATE ... RETURNING`) ifodalay olmaydi.
Qoida: **sodda → `find`, shartli/murakkab → Query Builder, juda murakkab → raw SQL (parametr bilan)**.

### 7.4 `LIKE` va wildcard

`%` va `_` — `LIKE`/`ILIKE` ichida **maxsus belgilar**. Foydalanuvchi `%` kiritsa, u "hamma narsa"ga aylanadi. Parametrlashtirish SQL-injection'dan saqlaydi,
lekin **wildcard**'dan saqlamaydi — ularni alohida ekranlash (escape) kerak: `LIKE ... ESCAPE '\'`.

### 7.5 Qatorlar bloklanishi va atomiklik

`UPDATE products SET quantity = quantity - 1 WHERE id = ? AND quantity >= 1` — **bitta atomik** buyruq: PostgreSQL qatorni bloklaydi,
shartni tekshiradi, yangilaydi. Qaysi qator o'zgargani (`affected`/`RETURNING`) bo'yicha natijani bilish mumkin.
Aksincha, "avval `SELECT` bilan o'qi → JS'da tekshir → `UPDATE`" ketma-ketligi **race condition** beradi: ikki parallel so'rov ikkalasi ham "yetarli" deb o'qiydi.
(Chuqur: Modul 04 va 23.)

### 7.6 Deadlock

Tranzaksiya A qator 1 ni, B qator 2 ni bloklab, keyin har biri ikkinchisinikini kutsa — **deadlock**. PostgreSQL ularni aniqlab, birini xato bilan bekor qiladi.
Odatiy yechim: bir nechta qatorni **doim bir xil tartibda** (masalan, `sku` bo'yicha saralab) yangilash.

---

## 8. Best practices

1. **Metodlarni biznes tilida nomlang:** `findOverdueLoans()`, `findLowStock()` — `findWhereCopiesLessThan()` emas.
2. **Repository entity qaytaradi/oladi, HTTP obyektlarini emas** (`Request`, `Response`, DTO sinfi — yo'q).
3. **Domen xatosi tashlang**, HTTP xatosini service (yoki filter) o'giradi.
4. **Hamma so'rov parametrlashtirilgan** bo'lsin. Foydalanuvchi matnini SQL'ga hech qachon `+` yoki `${}` bilan qo'shmang.
5. **Pul uchun `numeric`**, JS'da `number`/`Decimal` bilan to'g'ri o'giring; narxlarni yaxlitlashni (tiyin) bilib qo'ying.
6. **Cheklovlarni bazaga ham qo'ying** (`UNIQUE`, `CHECK`, `NOT NULL`). Ilova tekshiruvi *yetarli emas* — parallel so'rovlar uni aylanib o'tadi. Baza — oxirgi himoya chizig'i.
7. **Tranzaksiyalarni qisqa tuting** va ichida tashqi chaqiruv (HTTP, email) qilmang.
8. **Repository'ni "yupqa" tuting:** biznes qoida service'da. Repository — "qanday olish", service — "nima uchun va qachon".
9. **Interfeysni service ehtiyojidan chiqaring**, TypeORM imkoniyatlaridan emas (`IProductRepository.search(filter)`, `createQueryBuilder()` ni sizdirmang).

## 9. Odatiy xatolar

| Xato | Oqibat | To'g'risi |
|------|--------|-----------|
| Tranzaksiya ichida `this.repo.save` | Tranzaksiyaga kirmaydi, rollback ishlamaydi | Faqat `manager` |
| Repository'dan `QueryBuilder` qaytarish | SQL sizib chiqadi, abstraksiya yo'qoladi | Natija (entity/DTO) qaytaring |
| "Generic repository" `Repository<T>` — hamma narsa uchun | Biznes tili yo'qoladi, kerakmas metodlar | Domenga mos aniq metodlar |
| `SELECT` → JS tekshiruv → `UPDATE` | Race condition | Atomik `UPDATE ... WHERE shart` |
| Foydalanuvchi matnini `${}` bilan SQL'ga qo'shish | SQL injection | Parametrlar |
| `catch (e) { throw new BadRequestException() }` | Haqiqiy xato (baza o'chgan!) 400 bo'lib ketadi | Faqat *kutilgan* xatoni o'giring, qolganini qayta tashlang |
| `price` ni `string` holida qoldirish | `"10" + "5" = "105"` | `transformer` |
| Entity'ni to'g'ridan HTTP'ga qaytarish | Ichki maydonlar sizib chiqishi mumkin | Response DTO / `class-transformer` (keyingi modullarda) |
| Testda faqat mock'ga ishonish | SQL xatosi sezilmaydi | Repository uchun integration test |

## 10. Qachon ishlatish va qachon KERAK EMAS

**Ishlating**, agar:
- ma'lumotga kirish mantiqi murakkab (shartli filtr, agregat, tranzaksiya);
- bir xil so'rov bir necha joyda kerak;
- service'ni bazasiz testlamoqchi bo'lsangiz;
- kelajakda saqlash usulini almashtirish ehtimoli bor (kesh qatlami, boshqa baza).

**Ishlatmang (yoki sodda qiling)**, agar:
- shunchaki 3 ta maydonli CRUD — TypeORM'ning o'z `Repository<T>` si **o'zi allaqachon** repository pattern. Ustiga yana qatlam qo'shish — ortiqcha seremoniya.
- prototip/skript;
- interfeys + token + klass uchun *faqat bitta* implementatsiya bo'ladi va test uchun ham kerak bo'lmasa — oddiy klass (5-bo'lim) yetadi.

> **Mentor qoidasi:** pattern'ni "chiroyli" bo'lgani uchun emas, **og'riqni** (testlash qiyin, SQL tarqalgan, almashtirish kerak) yechgani uchun qo'llang.
> Siz bu modulda interfeys+tokenni *mashq sifatida* qo'llaysiz, chunki unit test (bazasiz) aynan shunga tayanadi.

## 11. Boshqa tushunchalar bilan aloqasi

| Tushuncha | Aloqa |
|-----------|-------|
| **Dependency Injection / Inversion** | Token orqali interfeysni bog'lash — DIP amaliyoti (Modul 08, 17) |
| **Entity Relations** | Repository ichida relation yuklash (`leftJoinAndSelect`) va N+1 (Modul 02) |
| **Pagination** | Repository'ning `search` metodi sahifalashga kengayadi (Modul 03) |
| **Transactions** | Bu yerda — tranzaksiya amaliy ko'rinishi; chuqur: Modul 04, 23 |
| **Service Layer / Unit of Work** | Bir nechta repository'ni bitta tranzaksiyada birlashtirish (Modul 05, 16) |
| **Specification pattern** | Filtrlarni obyektga aylantirish (Modul 16) |
| **Clean/Hexagonal Architecture** | Repository interfeysi — "port", TypeORM implementatsiyasi — "adapter" (Modul 18) |

---

## Tekshiruv savollari (o'zingizga bering)

1. `interface` nega DI token bo'la olmaydi? Nega `Symbol` ishlatamiz?
2. Nega tranzaksiya ichida `this.repo.save()` ishlamaydi?
3. `WHERE quantity >= :q` bilan `UPDATE` qilish nega "o'qi, tekshir, yoz" dan xavfsizroq?
4. PostgreSQL `numeric` Node'da nega string bo'lib keladi va buni qanday tuzatasiz?
5. Repository nega `NotFoundException` tashlamasligi kerak?

Tayyor bo'lsangiz → **[`assignment.md`](assignment.md)**.
