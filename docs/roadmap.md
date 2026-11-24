# Yo'l xaritasi (Roadmap)

Mavzular **bog'liqlik (dependency)** tartibida joylashtirilgan: har bir mavzu oldingilariga tayanadi.
Asl rejadagi tartibni ozgina o'zgartirdim — sabablari pastda.

## Bog'liqlik grafi

```text
                       ┌──────────────────────────┐
                       │ 01 Repository Pattern    │
                       └────────────┬─────────────┘
                                    │
                       ┌────────────▼─────────────┐
                       │ 02 Entity Relations      │
                       └───────┬──────────┬───────┘
                               │          │
              ┌────────────────▼──┐   ┌───▼──────────────────┐
              │ 03 Pagination &   │   │ 04 Transactions      │
              │    Query Building │   │    (asoslar)         │
              └────────────────┬──┘   └───┬──────────────────┘
                               └────┬─────┘
                       ┌────────────▼─────────────┐
                       │ 05 Service Architecture  │
                       └───────┬──────────┬───────┘
                               │          │
                  ┌────────────▼──┐   ┌───▼──────────────┐
                  │ 06 RBAC       │   │ 07 File Upload   │
                  └───────┬───────┘   └───┬──────────────┘
                          └──────┬────────┘
                                 ▼
                      PHASE 1: Advanced NestJS (08–11)
                                 ▼
                      PHASE 2: Design Patterns (12–16)
                                 ▼
                      PHASE 3: Architecture (17–21)
                                 ▼
                      PHASE 4: Advanced Backend (22–30)
                                 ▼
                         31  ServiceHub (capstone)
```

## Phase 0 — Backend Fundamentals Deepening

| # | Mavzu | Prerequisite | Nima uchun aynan shu o'rinda |
|---|-------|--------------|------------------------------|
| 01 | **Repository Pattern** — custom repository, Query Builder, interfeys + DI token, tranzaksiya, testlash | TypeORM asoslari | Hamma keyingi mavzu ma'lumotga kirishni repository orqali qiladi |
| 02 | **Entity Relations** — OneToOne/OneToMany/ManyToMany, JoinColumn, cascade, N+1, constraint'lar | 01 | Relations'ni repository ichida to'g'ri yuklashni bilmasdan N+1 muammosi paydo bo'ladi |
| 03 | **Pagination & Query Building** — offset, cursor, keyset, filter/sort/search, dinamik so'rovlar | 01, 02 | Relation'li ma'lumotlar ustida sahifalash eng ko'p xato qilinadigan joy |
| 04 | **Transactions asoslari** — atomiklik, QueryRunner, rollback, savepoint | 01, 02 | *(Rejada Phase 4 da edi — oldinga surdim.)* Modul 01 da tranzaksiyaga tanishtiramiz, bu yerda chuqurlashtiramiz |
| 05 | **Service Architecture** — mas'uliyat ajratish, modullararo aloqa, circular dependency, shared logic | 01–04 | RBAC va File Upload'ni toza arxitekturada qurish uchun |
| 06 | **RBAC & Permissions** — role, permission, Guard, Reflector, ownership, ACL | 02, 05 | Role/Permission jadvallari relation talab qiladi |
| 07 | **File Upload** — Multer, validatsiya, Local/S3/R2, signed URL, xavfsizlik | 05 | Storage abstraksiyasi = Repository/Adapter g'oyasining davomi |

## Phase 1 — Advanced NestJS

| # | Mavzu | Prerequisite |
|---|-------|--------------|
| 08 | Advanced DI: custom provider (`useClass/useValue/useFactory/useExisting`), scope (DEFAULT/REQUEST/TRANSIENT) | 05 |
| 09 | Dynamic Modules (`forRoot/forRootAsync/register`), Configuration architecture | 08 |
| 10 | Module encapsulation (`exports`, `Global`), Application Lifecycle hooks, graceful shutdown | 08, 09 |
| 11 | Testing Architecture: test piramidasi, test DB strategiyasi, fixtures/factories, test double'lar | 01–10 |

## Phase 2 — Design Patterns

| # | Mavzu | Prerequisite |
|---|-------|--------------|
| 12 | Creational: Factory Method, Abstract Factory, Builder, Singleton | 08 |
| 13 | Structural: **Adapter** (to'lov provayderi uchun kerak), Facade, Decorator, Proxy, Composite | 09 |
| 14 | Behavioral I: Strategy, Observer, Template Method, Chain of Responsibility | 08, 13 |
| 15 | Behavioral II: Command, State (booking statuslari!), Mediator | 14 |
| 16 | Enterprise I: Unit of Work, Specification, Service Layer, Data Mapper | 01, 04, 05 |

> *Outbox va Saga* — ular xabar almashish va idempotency'siz mazmunsiz, shuning uchun **26-mavzuga** ko'chirildi.

## Phase 3 — Software Architecture

| # | Mavzu | Prerequisite |
|---|-------|--------------|
| 17 | SOLID + Dependency Inversion (avvalgi mavzularni umumlashtiradi) | 01–16 |
| 18 | Clean Architecture & Hexagonal (Ports & Adapters) | 17 |
| 19 | DDD: Entity/Value Object/Aggregate, Bounded Context | 18 |
| 20 | Modular Monolith (modul chegaralari, public API) | 19 |
| 21 | CQRS, Domain Events, Event-Driven Architecture | 19, 20 |

## Phase 4 — Advanced Backend Engineering

| # | Mavzu | Prerequisite |
|---|-------|--------------|
| 22 | DB Normalization & Indexing (EXPLAIN, B-Tree, composite/partial index) | 02, 03 |
| 23 | Isolation Levels, Optimistic/Pessimistic Locking, Concurrency | 04, 22 |
| 24 | Redis & Caching (cache-aside, invalidation) | 05 |
| 25 | BullMQ, Background Jobs, Message Queues | 21, 24 |
| 26 | Idempotency, **Outbox**, **Saga** | 21, 23, 25 |
| 27 | Rate Limiting & API Security (OWASP API Top 10) | 06, 24 |
| 28 | Logging & Observability (structured logs, metrics, tracing) | 10 |
| 29 | Performance Optimization (profiling, N+1, caching, connection pool) | 22–24, 28 |
| 30 | Docker & Production Deployment | 09, 28 |

## Capstone

| # | Loyiha | Prerequisite |
|---|--------|--------------|
| 31 | **ServiceHub** — modul-ma'lumot: [`architecture.md`](architecture.md) | 01–30 |

## Mavzu davomiyligi (taxminiy)

| Bosqich | Har bir mavzuga | Jami |
|---------|-----------------|------|
| Phase 0 | 1–2 hafta (nazariya 1 kun + topshiriq 3–6 kun) | ~8–10 hafta |
| Phase 1–2 | 1 hafta | ~9 hafta |
| Phase 3 | 1–1.5 hafta | ~6 hafta |
| Phase 4 | 1–1.5 hafta | ~10 hafta |
| ServiceHub | — | 4–6 hafta |

Bu faqat mo'ljal. Sifat tezlikdan muhimroq: mavzuni **tushunmasdan** o'tmaymiz.

## Optimizatsiyalar (asl rejadan farqlar)

1. **Transactions** Phase 4 dan Phase 0 ga ko'chdi — sizning zaif tomonlaringiz ro'yxatida bor va 05–06 shunga tayanadi. Chuqur qismi (isolation, locking) 23 da qoladi.
2. **RBAC** va **File Upload** Service Architecture'dan keyin — ular modullararo aloqa va mas'uliyat ajratishni talab qiladi.
3. **Outbox / Saga** Enterprise pattern'lardan chiqarilib, 26 ga ko'chdi (kontekstsiz yodlash befoyda).
4. **SOLID** Phase 3 boshida — o'sha vaqtga kelib siz amalda ko'p marta uchratgan bo'lasiz, endi nomlari va aniq qoidalari mantiqli bo'ladi.
