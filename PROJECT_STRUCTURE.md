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
```

## Полный список файлов приложения

- `.env`
- `config/database.js`
- `config/yookassa.js`
- `controllers/adminController.js`
- `controllers/authController.js`
- `controllers/chatController.js`
- `controllers/dealController.js`
- `controllers/orderController.js`
- `controllers/pageController.js`
- `controllers/paymentController.js`
- `controllers/serviceController.js`
- `controllers/withdrawalController.js`
- `controllers/workController.js`
- `middleware/adminMiddleware.js`
- `middleware/authMiddleware.js`
- `models/userModel.js`
- `package-lock.json`
- `package.json`
- `PROJECT_STRUCTURE.md`
- `public/css/admin.css`
- `public/css/aut_reg.css`
- `public/css/birzha.css`
- `public/css/chat.css`
- `public/css/confirm-modal.css`
- `public/css/create-work.css`
- `public/css/header.css`
- `public/css/legal.css`
- `public/css/lenta_new.css`
- `public/css/notifications.css`
- `public/css/orders.css`
- `public/css/portfolio.css`
- `public/css/profile.css`
- `public/css/review.css`
- `public/css/services.css`
- `public/css/settings.css`
- `public/css/style.css`
- `public/css/subscriptions.css`
- `public/css/work.css`
- `public/font/MONTSERRAT-BOLD.TTF`
- `public/font/Montserrat-Light.ttf`
- `public/font/MONTSERRAT-MEDIUM.TTF`
- `public/font/MONTSERRAT-REGULAR.TTF`
- `public/font/MONTSERRAT-SEMIBOLD.TTF`
- `public/font/OFONT.RU_UNI SANS.TTF`
- `public/img/ab934e72b62ae5df2cfc9b2102b0e228.jpg`
- `public/img/bg_grafit.svg`
- `public/img/CTA_bg.svg`
- `public/img/CTA_bg1.svg`
- `public/img/fon_cont.svg`
- `public/img/fon_main.svg`
- `public/img/footer.svg`
- `public/img/Frame 113342 (1).png`
- `public/img/Group.svg`
- `public/img/hero_bg.svg`
- `public/img/LINESTOK.svg`
- `public/img/LOGO.svg`
- `public/img/Logo_nav.svg`
- `public/img/Max_logo 1.svg`
- `public/img/step1.svg`
- `public/img/step2.svg`
- `public/img/step3.svg`
- `public/img/swith-blok-bg.svg`
- `public/img/swith-logo.svg`
- `public/img/telegram_logo_icon_144811 1.svg`
- `public/img/VK Logo White 1.svg`
- `public/img/work_img.svg`
- `public/img/work_Logo.svg`
- `public/img/yandex.svg`
- `public/js/auth-page.js`
- `public/js/intelligence-demo.js`
- `public/uploads/avatars/1775409164576-252336601.jpg`
- `public/uploads/avatars/1775418397401-477077419.png`
- `public/uploads/avatars/1779557053378-420478164.png`
- `public/uploads/chat-files/chat-1775449076808-488100370.pdf`
- `public/uploads/chat-files/chat-1775449076861-888525189.docx`
- `public/uploads/chat-files/chat-1775449076873-610602619.svg`
- `public/uploads/chat-files/chat-1776511287582-481941278.svg`
- `public/uploads/order-files/order-1779565281599-815121429.svg`
- `public/uploads/order-files/order-1779565283299-38392445.svg`
- `public/uploads/order-files/order-1779565283508-112663838.svg`
- `public/uploads/order-files/order-1779565503422-88464854.png`
- `public/uploads/order-files/order-1779565655330-150064402.png`
- `public/uploads/service-cover-1779366105050-688434577.png`
- `public/uploads/service-cover-1779366557177-187579525.png`
- `public/uploads/service-cover-1779368955889-386890198.png`
- `public/uploads/service-cover-1779376602883-324858142.png`
- `public/uploads/service-cover-1779565057377-97796421.png`
- `public/uploads/work-1775383885359-997105143.jpg`
- `public/uploads/work-1775383885366-3432031.jpg`
- `public/uploads/work-1775426273899-967761976.jpg`
- `public/uploads/work-1775426273909-122372165.jpg`
- `public/uploads/work-1775426273921-963227644.png`
- `public/uploads/work-1775426273934-340322107.jpg`
- `public/uploads/work-1775426273938-797912053.jpg`
- `public/uploads/work-1775426273940-962505868.jpg`
- `public/uploads/work-1775426273944-158549437.jpg`
- `public/uploads/work-1775458159158-200523542.jpg`
- `public/uploads/work-1775458159187-500441087.jpg`
- `public/uploads/work-1775458159189-901298205.jpg`
- `public/uploads/work-1775458159190-976809098.jpg`
- `public/uploads/work-1775458159191-809130171.jpg`
- `public/uploads/work-1775458159193-608338318.jpg`
- `public/uploads/work-1775458159203-121685421.jpg`
- `public/uploads/work-1775569562561-267495121.jpg`
- `public/uploads/work-1775569562691-320447315.jpg`
- `public/uploads/work-1775569562738-518145510.jpg`
- `public/uploads/work-1775569562752-583475621.jpg`
- `public/uploads/work-1775569576977-648517814.jpg`
- `public/uploads/work-1775569576984-220008140.jpg`
- `public/uploads/work-1775569576997-306570746.jpg`
- `public/uploads/work-1775569577009-497271542.jpg`
- `public/uploads/work-1775587923518-680956641.jpg`
- `public/uploads/work-1775587923520-447029074.jpg`
- `public/uploads/work-1775587923520-716295531.jpg`
- `public/uploads/work-1775587923521-379504161.jpg`
- `public/uploads/work-1775591599350-25308467.jpg`
- `public/uploads/work-1775591599356-144431097.jpg`
- `public/uploads/work-1775591599361-408768808.jpg`
- `public/uploads/work-1775591599370-61289223.jpg`
- `public/uploads/work-1775603071674-425234226.jpg`
- `public/uploads/work-1775603071680-166089262.jpg`
- `public/uploads/work-1775603071680-940309842.jpg`
- `public/uploads/work-1775603071681-710194640.jpg`
- `public/uploads/work-1775620973346-421738616.jpg`
- `public/uploads/work-1775620973350-857683317.jpg`
- `public/uploads/work-1775620973355-779777225.jpg`
- `public/uploads/work-1775620973357-971045481.jpg`
- `public/uploads/work-1775620973365-68375967.jpg`
- `routes/adminRoutes.js`
- `routes/apiRoutes.js`
- `routes/authRoutes.js`
- `routes/pageRoutes.js`
- `server.js`
- `views/admin/admin-sidebar.ejs`
- `views/admin/complaints.ejs`
- `views/admin/dashboard.ejs`
- `views/admin/export.ejs`
- `views/admin/users.ejs`
- `views/admin/withdrawals.ejs`
- `views/admin/works.ejs`
- `views/auth.ejs`
- `views/balance.ejs`
- `views/birzha.ejs`
- `views/chat.ejs`
- `views/create-order.ejs`
- `views/create-service.ejs`
- `views/create-work.ejs`
- `views/index.ejs`
- `views/legal/marketing-consent.ejs`
- `views/legal/offer.ejs`
- `views/legal/partials/legal-hero.ejs`
- `views/legal/partials/page-header.ejs`
- `views/legal/personal-data-consent.ejs`
- `views/legal/privacy-policy.ejs`
- `views/lenta_new.ejs`
- `views/notifications.ejs`
- `views/order.ejs`
- `views/orders.ejs`
- `views/partials/confirm-modal.ejs`
- `views/partials/footer.ejs`
- `views/partials/header-actions.ejs`
- `views/portfolio.ejs`
- `views/profile.ejs`
- `views/propose-deal.ejs`
- `views/review.ejs`
- `views/service.ejs`
- `views/services.ejs`
- `views/settings.ejs`
- `views/subscriptions.ejs`
- `views/withdraw.ejs`
- `views/work.ejs`

## Основные каталоги

- `config/` — конфигурация подключения к базе данных и платёжным сервисам.
- `controllers/` — обработчики бизнес-логики для страниц, заказов, работ, оплат, чатов и админки.
- `middleware/` — промежуточные обработчики авторизации и административного доступа.
- `models/` — модели доступа к данным.
- `public/` — статические файлы: CSS, JavaScript, изображения, шрифты и загруженные пользователями файлы.
- `routes/` — маршруты Express-приложения.
- `views/` — EJS-шаблоны страниц, админки, юридических документов и переиспользуемых partials.
