# Структура проекта Liniti

Документ содержит дерево проекта и полный список файлов приложения.

> Примечание: каталоги `.git/` и `node_modules/` не раскрываются в дереве и списке файлов, потому что это служебные данные Git и устанавливаемые зависимости. Сам каталог `node_modules/` показан в дереве верхнего уровня как исключённый.

## Краткая сводка

- Файлов приложения: 171
- Каталогов приложения: 19
- Основная точка входа: `server.js`
- Менеджер зависимостей: npm (`package.json`, `package-lock.json`)

## Дерево проекта

```text
Liniti/
├── .git/ (исключено: зависимости/служебные файлы)
├── config/
│   ├── database.js
│   └── yookassa.js
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── chatController.js
│   ├── dealController.js
│   ├── orderController.js
│   ├── pageController.js
│   ├── paymentController.js
│   ├── serviceController.js
│   ├── withdrawalController.js
│   └── workController.js
├── middleware/
│   ├── adminMiddleware.js
│   └── authMiddleware.js
├── models/
│   └── userModel.js
├── node_modules/ (исключено: зависимости/служебные файлы)
├── public/
│   ├── css/
│   │   ├── admin.css
│   │   ├── aut_reg.css
│   │   ├── birzha.css
│   │   ├── chat.css
│   │   ├── confirm-modal.css
│   │   ├── create-work.css
│   │   ├── header.css
│   │   ├── legal.css
│   │   ├── lenta_new.css
│   │   ├── notifications.css
│   │   ├── orders.css
│   │   ├── portfolio.css
│   │   ├── profile.css
│   │   ├── review.css
│   │   ├── services.css
│   │   ├── settings.css
│   │   ├── style.css
│   │   ├── subscriptions.css
│   │   └── work.css
│   ├── font/
│   │   ├── MONTSERRAT-BOLD.TTF
│   │   ├── Montserrat-Light.ttf
│   │   ├── MONTSERRAT-MEDIUM.TTF
│   │   ├── MONTSERRAT-REGULAR.TTF
│   │   ├── MONTSERRAT-SEMIBOLD.TTF
│   │   └── OFONT.RU_UNI SANS.TTF
│   ├── img/
│   │   ├── ab934e72b62ae5df2cfc9b2102b0e228.jpg
│   │   ├── bg_grafit.svg
│   │   ├── CTA_bg.svg
│   │   ├── CTA_bg1.svg
│   │   ├── fon_cont.svg
│   │   ├── fon_main.svg
│   │   ├── footer.svg
│   │   ├── Frame 113342 (1).png
│   │   ├── Group.svg
│   │   ├── hero_bg.svg
│   │   ├── LINESTOK.svg
│   │   ├── LOGO.svg
│   │   ├── Logo_nav.svg
│   │   ├── Max_logo 1.svg
│   │   ├── step1.svg
│   │   ├── step2.svg
│   │   ├── step3.svg
│   │   ├── swith-blok-bg.svg
│   │   ├── swith-logo.svg
│   │   ├── telegram_logo_icon_144811 1.svg
│   │   ├── VK Logo White 1.svg
│   │   ├── work_img.svg
│   │   ├── work_Logo.svg
│   │   └── yandex.svg
│   ├── js/
│   │   ├── auth-page.js
│   │   └── intelligence-demo.js
│   └── uploads/
│       ├── avatars/
│       │   ├── 1775409164576-252336601.jpg
│       │   ├── 1775418397401-477077419.png
│       │   └── 1779557053378-420478164.png
│       ├── chat-files/
│       │   ├── chat-1775449076808-488100370.pdf
│       │   ├── chat-1775449076861-888525189.docx
│       │   ├── chat-1775449076873-610602619.svg
│       │   └── chat-1776511287582-481941278.svg
│       ├── order-files/
│       │   ├── order-1779565281599-815121429.svg
│       │   ├── order-1779565283299-38392445.svg
│       │   ├── order-1779565283508-112663838.svg
│       │   ├── order-1779565503422-88464854.png
│       │   └── order-1779565655330-150064402.png
│       ├── service-cover-1779366105050-688434577.png
│       ├── service-cover-1779366557177-187579525.png
│       ├── service-cover-1779368955889-386890198.png
│       ├── service-cover-1779376602883-324858142.png
│       ├── service-cover-1779565057377-97796421.png
│       ├── work-1775383885359-997105143.jpg
│       ├── work-1775383885366-3432031.jpg
│       ├── work-1775426273899-967761976.jpg
│       ├── work-1775426273909-122372165.jpg
│       ├── work-1775426273921-963227644.png
│       ├── work-1775426273934-340322107.jpg
│       ├── work-1775426273938-797912053.jpg
│       ├── work-1775426273940-962505868.jpg
│       ├── work-1775426273944-158549437.jpg
│       ├── work-1775458159158-200523542.jpg
│       ├── work-1775458159187-500441087.jpg
│       ├── work-1775458159189-901298205.jpg
│       ├── work-1775458159190-976809098.jpg
│       ├── work-1775458159191-809130171.jpg
│       ├── work-1775458159193-608338318.jpg
│       ├── work-1775458159203-121685421.jpg
│       ├── work-1775569562561-267495121.jpg
│       ├── work-1775569562691-320447315.jpg
│       ├── work-1775569562738-518145510.jpg
│       ├── work-1775569562752-583475621.jpg
│       ├── work-1775569576977-648517814.jpg
│       ├── work-1775569576984-220008140.jpg
│       ├── work-1775569576997-306570746.jpg
│       ├── work-1775569577009-497271542.jpg
│       ├── work-1775587923518-680956641.jpg
│       ├── work-1775587923520-447029074.jpg
│       ├── work-1775587923520-716295531.jpg
│       ├── work-1775587923521-379504161.jpg
│       ├── work-1775591599350-25308467.jpg
│       ├── work-1775591599356-144431097.jpg
│       ├── work-1775591599361-408768808.jpg
│       ├── work-1775591599370-61289223.jpg
│       ├── work-1775603071674-425234226.jpg
│       ├── work-1775603071680-166089262.jpg
│       ├── work-1775603071680-940309842.jpg
│       ├── work-1775603071681-710194640.jpg
│       ├── work-1775620973346-421738616.jpg
│       ├── work-1775620973350-857683317.jpg
│       ├── work-1775620973355-779777225.jpg
│       ├── work-1775620973357-971045481.jpg
│       └── work-1775620973365-68375967.jpg
├── routes/
│   ├── adminRoutes.js
│   ├── apiRoutes.js
│   ├── authRoutes.js
│   └── pageRoutes.js
├── views/
│   ├── admin/
│   │   ├── admin-sidebar.ejs
│   │   ├── complaints.ejs
│   │   ├── dashboard.ejs
│   │   ├── export.ejs
│   │   ├── users.ejs
│   │   ├── withdrawals.ejs
│   │   └── works.ejs
│   ├── legal/
│   │   ├── partials/
│   │   │   ├── legal-hero.ejs
│   │   │   └── page-header.ejs
│   │   ├── marketing-consent.ejs
│   │   ├── offer.ejs
│   │   ├── personal-data-consent.ejs
│   │   └── privacy-policy.ejs
│   ├── partials/
│   │   ├── confirm-modal.ejs
│   │   ├── footer.ejs
│   │   └── header-actions.ejs
│   ├── auth.ejs
│   ├── balance.ejs
│   ├── birzha.ejs
│   ├── chat.ejs
│   ├── create-order.ejs
│   ├── create-service.ejs
│   ├── create-work.ejs
│   ├── index.ejs
│   ├── lenta_new.ejs
│   ├── notifications.ejs
│   ├── order.ejs
│   ├── orders.ejs
│   ├── portfolio.ejs
│   ├── profile.ejs
│   ├── propose-deal.ejs
│   ├── review.ejs
│   ├── service.ejs
│   ├── services.ejs
│   ├── settings.ejs
│   ├── subscriptions.ejs
│   ├── withdraw.ejs
│   └── work.ejs
├── .env
├── package-lock.json
├── package.json
├── PROJECT_STRUCTURE.md
└── server.js

- `config/` — конфигурация подключения к базе данных и платёжным сервисам.
- `controllers/` — обработчики бизнес-логики для страниц, заказов, работ, оплат, чатов и админки.
- `middleware/` — промежуточные обработчики авторизации и административного доступа.
- `models/` — модели доступа к данным.
- `public/` — статические файлы: CSS, JavaScript, изображения, шрифты и загруженные пользователями файлы.
- `routes/` — маршруты Express-приложения.
- `views/` — EJS-шаблоны страниц, админки, юридических документов и переиспользуемых partials.

## 4.1 Описание веб-приложения

### 4.1.1 Описание веб-дизайна приложения

Веб-приложение **Liniti** реализовано как серверное приложение на Express.js с шаблонизатором EJS. Пользовательский интерфейс строится из EJS-страниц каталога `views/`, общих partial-шаблонов и статических ресурсов каталога `public/`.

Основные элементы дизайна:

- **Единая визуальная айдентика.** Для логотипов и декоративных элементов используются SVG- и PNG-материалы из `public/img/`: `LOGO.svg`, `Logo_nav.svg`, `hero_bg.svg`, `fon_main.svg`, `CTA_bg.svg`, `footer.svg`, `step1.svg`, `step2.svg`, `step3.svg`, `work_img.svg` и другие графические файлы.
- **Типографика.** Шрифты Montserrat и Uni Sans размещены в `public/font/` и подключаются через CSS-файлы интерфейса.
- **Компонентная стилизация страниц.** Для каждой крупной страницы или группы страниц выделен отдельный CSS-файл: `style.css` для главной страницы, `header.css` для навигации, `lenta_new.css` для ленты работ, `birzha.css` для биржи, `profile.css` для профиля, `portfolio.css` для портфолио, `orders.css` для заказов, `services.css` для услуг, `chat.css` для чата, `admin.css` для административной панели.
- **Переиспользуемые блоки.** Общие элементы интерфейса вынесены в `views/partials/`: футер, действия в шапке и модальное окно подтверждения. Юридические страницы используют отдельные partials в `views/legal/partials/`.
- **Адаптация под разные пользовательские сценарии.** В приложении есть публичные страницы, страницы авторизованного пользователя и административные страницы. Доступ к закрытым разделам ограничивается middleware авторизации.

Пример подключения шаблонизатора, каталога представлений и статических файлов находится в основном модуле приложения:

```js
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
```

Для иллюстрации реализованного дизайна в отчёте можно использовать следующие страницы веб-приложения:

| Страница | Файл шаблона | Файл стилей | Назначение |
| --- | --- | --- | --- |
| Главная | `views/index.ejs` | `public/css/style.css` | Презентация сервиса, CTA-блоки, вывод последних работ. |
| Лента работ | `views/lenta_new.ejs` | `public/css/lenta_new.css` | Просмотр портфолио пользователей, поиск, категории, лайки и подписки. |
| Биржа | `views/birzha.ejs` | `public/css/birzha.css` | Вывод услуг исполнителей и заказов клиентов. |
| Профиль | `views/profile.ejs` | `public/css/profile.css` | Информация о пользователе, аватар, статистика, ссылки на работы. |
| Портфолио | `views/portfolio.ejs` | `public/css/portfolio.css` | Список работ пользователя и управление собственными публикациями. |
| Чат | `views/chat.ejs` | `public/css/chat.css` | Переписка пользователей, отправка сообщений и файлов. |
| Админ-панель | `views/admin/dashboard.ejs` | `public/css/admin.css` | Управление пользователями, жалобами, работами и выплатами. |

### 4.1.2 Описание веб-страниц приложения

Маршрутизация страниц реализована в `routes/pageRoutes.js`, а подготовка данных для шаблонов — в контроллерах каталога `controllers/`. Основные страницы приложения создаются динамически: контроллер выполняет SQL-запросы к PostgreSQL, формирует объект данных и передаёт его в `res.render()` для отображения EJS-шаблона.

Фрагмент основных маршрутов страниц:

```js
router.get('/', pageController.getIndexPage);
router.get('/lenta', pageController.getLentaPage);
router.get('/birzha', requireAuth, pageController.getBirzhaPage);
router.get('/profile', pageController.getProfilePage);
router.get('/profile/:id', pageController.getProfilePage);
router.get('/portfolio', requireAuth, pageController.getPortfolioPage);
router.get('/orders', requireAuth, pageController.getOrdersPage);
router.get('/services', requireAuth, pageController.getServicesPage);
router.get('/works/create', requireAuth, pageController.getCreateWorkPage);
router.get('/works/:id', pageController.getWorkPage);
router.get('/chat', requireAuth, (req, res) => {
  res.render('chat', {
    currentUser: req.session.user,
    csrfToken: req.session?.csrfToken || '',
  });
});
```

Основные страницы и функции:

| Раздел | URL | Шаблон | Контроллер / обработчик | Основное взаимодействие пользователя |
| --- | --- | --- | --- | --- |
| Главная страница | `/` | `views/index.ejs` | `pageController.getIndexPage` | Просмотр описания сервиса и последних активных работ. |
| Лента работ | `/lenta` | `views/lenta_new.ejs` | `pageController.getLentaPage` | Поиск работ, просмотр карточек, фильтрация по категориям, лайки, переход в профиль автора. |
| Биржа | `/birzha` | `views/birzha.ejs` | `pageController.getBirzhaPage` | Просмотр услуг и заказов, переход к карточке услуги/заказа, предложение сделки. |
| Авторизация | `/auth`, `/login`, `/register` | `views/auth.ejs` | `authController` и `routes/authRoutes.js` | Регистрация, вход, клиентская проверка формы через `public/js/auth-page.js`. |
| Профиль | `/profile`, `/profile/:id` | `views/profile.ejs` | `pageController.getProfilePage` | Просмотр данных пользователя, статистики, аватара, отзывов и публикаций. |
| Портфолио | `/portfolio`, `/portfolio/:id` | `views/portfolio.ejs` | `pageController.getPortfolioPage` | Просмотр коллекций и работ, управление собственным портфолио. |
| Создание работы | `/works/create` | `views/create-work.ejs` | `pageController.getCreateWorkPage`, `workController.createWork` | Заполнение формы работы, выбор категорий, загрузка изображений. |
| Страница работы | `/works/:id` | `views/work.ejs` | `pageController.getWorkPage` | Просмотр подробного описания, изображений, автора, жалоба на работу. |
| Услуги | `/services` | `views/services.ejs` | `pageController.getServicesPage` | Просмотр услуг, фильтрация, переход к созданию услуги. |
| Создание услуги | `/services/create` | `views/create-service.ejs` | `pageController.getCreateServicePage`, `serviceController.createService` | Заполнение названия, описания, цены, сроков и категорий. |
| Заказы | `/orders` | `views/orders.ejs` | `pageController.getOrdersPage` | Просмотр заказов пользователя и их статусов. |
| Создание заказа | `/orders/create` | `views/create-order.ejs` | `orderController` и `routes/apiRoutes.js` | Описание задачи, цена, сроки, прикрепление файлов. |
| Чат | `/chat` | `views/chat.ejs` | `chatController`, API-маршруты чата | Переписка, выбор собеседника, отправка вложений, создание сделки из диалога. |
| Уведомления | `/notifications` | `views/notifications.ejs` | `pageController.getNotificationsPage` | Просмотр уведомлений и отметка их прочитанными. |
| Баланс и вывод средств | `/balance`, `/withdraw` | `views/balance.ejs`, `views/withdraw.ejs` | `paymentController`, `withdrawalController` | Просмотр баланса, пополнение, оформление заявки на вывод. |
| Админ-панель | `/admin/...` | `views/admin/*.ejs` | `adminController`, `routes/adminRoutes.js` | Управление пользователями, работами, жалобами, экспортом и заявками на выплаты. |

Код создания страницы на примере главной страницы:

```js
const getIndexPage = async (req, res) => {
  try {
    const recentWorks = await db.query(`
      SELECT w.id, w.title, w.created_at, u.first_name, u.last_name,
             COALESCE((
               SELECT wi.image_url
               FROM work_images wi
               WHERE wi.work_id = w.id
               ORDER BY COALESCE(wi.sort_order, 0), wi.id
               LIMIT 1
             ), '/img/ab934e72b62ae5df2cfc9b2102b0e228.jpg') AS preview_image
      FROM works w
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'active'
      ORDER BY w.created_at DESC
      LIMIT 6
    `);

    res.render('index', {
      recentWorks: recentWorks.rows,
    });
  } catch (error) {
    res.render('index', { recentWorks: [] });
  }
};
```

Взаимодействие с пользователем реализовано через HTML-формы, POST-запросы и JSON API. Для защищённых операций используются `requireAuth` и CSRF-токен из middleware авторизации. Загрузка изображений работ и обложек услуг выполняется через `multer`, после чего файлы сохраняются в `public/uploads/`.

Пример маршрута создания работы с загрузкой изображений:

```js
router.post(
  '/works/create',
  requireAuth,
  workUpload.array('workImages', MAX_WORK_IMAGES),
  csrfProtect,
  workController.createWork
);
```

### 4.1.3 Описание динамического контента веб-приложения

Динамический контент формируется на сервере и в браузере. Серверная часть получает данные из PostgreSQL через модуль `config/database.js`, а клиентская часть обновляет отдельные элементы интерфейса без полной перезагрузки страницы через API-запросы.

Основные виды динамического контента:

- **Главная страница.** Выводит последние активные работы пользователей из таблиц `works`, `work_images` и `users`.
- **Лента работ.** Загружает активные работы, изображения, категории, состояние лайка и подписки текущего пользователя. Поддерживает поисковый запрос `q`.
- **Биржа.** Одновременно получает список активных услуг и заказов с данными исполнителей и заказчиков.
- **Профиль и портфолио.** Отображают персональные данные пользователя, аватар, работы, коллекции, подписки и статистику.
- **Чат.** Работает с сообщениями, вложениями и списком диалогов через `chatController` и API-маршруты.
- **Уведомления.** Возвращаются JSON-эндпоинтом `/api/notifications` и могут отмечаться прочитанными.
- **Лайки и подписки.** Изменяются асинхронно через API, после чего интерфейс обновляет счётчики и состояние кнопок.
- **Файлы пользователя.** Аватары, изображения работ, файлы заказов и вложения чата сохраняются в `public/uploads/` и используются в динамических карточках.

Пример динамической загрузки ленты работ:

```js
const getLentaPage = async (req, res) => {
  const currentUserId = req.session.user?.id || null;
  const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const searchPattern = searchQuery ? `%${searchQuery}%` : null;

  const works = await db.query(`
    SELECT w.*, u.id as user_id, u.first_name, u.last_name, u.avatar,
           COALESCE((
             SELECT ARRAY_AGG(wi.image_url ORDER BY COALESCE(wi.sort_order, 0), wi.id)
             FROM work_images wi
             WHERE wi.work_id = w.id
           ), ARRAY[]::text[]) as images,
           COALESCE((
             SELECT TRUE
             FROM work_likes wl
             WHERE wl.work_id = w.id AND wl.user_id = $1
             LIMIT 1
           ), FALSE) as is_liked
    FROM works w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'active'
      AND ($2::text IS NULL OR w.title ILIKE $2 OR u.first_name ILIKE $2 OR u.last_name ILIKE $2)
    ORDER BY w.created_at DESC
  `, [currentUserId, searchPattern]);

  res.render('lenta_new', {
    works: works.rows,
    searchQuery,
  });
};
```

Пример API для лайков работ:

```js
router.post('/api/works/:workId/like', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const workId = Number(req.params.workId);

  const existingLike = await db.query(
    'SELECT 1 FROM work_likes WHERE work_id = $1 AND user_id = $2',
    [workId, userId]
  );

  const isLiked = existingLike.rows.length > 0;
  if (isLiked) {
    await db.query('DELETE FROM work_likes WHERE work_id = $1 AND user_id = $2', [workId, userId]);
  } else {
    await db.query('INSERT INTO work_likes (work_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [workId, userId]);
  }

  return res.json({ success: true, liked: !isLiked });
});
```

Пример клиентского динамического поведения на странице авторизации:

```js
const switchForms = () => {
  if (isLoginMode) {
    sidePanel.classList.remove('slide-to-login');
    sidePanel.classList.add('slide-to-register');
    registerContainer.classList.add('open');
    isLoginMode = false;
    return;
  }

  sidePanel.classList.remove('slide-to-register');
  sidePanel.classList.add('slide-to-login');
  registerContainer.classList.remove('open');
  isLoginMode = true;
};
```

Таким образом, раздел 4.1 описывает не только внешний вид приложения, но и связь между шаблонами, маршрутами, контроллерами, базой данных и клиентскими сценариями. Полный код страниц находится в каталоге `views/`, серверная логика — в `controllers/` и `routes/`, а стили и клиентские скрипты — в `public/css/` и `public/js/`.
