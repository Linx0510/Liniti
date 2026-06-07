# Система модальных уведомлений для админ-панели

## Описание
Система автоматически показывает модальные уведомления для всех действий администратора в админ-панели. Уведомления появляются после выполнения действия и содержат информацию об успехе или ошибке операции.

## Файлы системы

### 1. **Компоненты UI**
- `views/partials/admin-notification-modal.ejs` - HTML модуль модального окна
- `public/css/admin-notification.css` - Стили для модального окна

### 2. **JavaScript**
- `public/js/admin-notification.js` - Основная логика системы

### 3. **Интегрированные в админ-страницы**
- `views/admin/dashboard.ejs`
- `views/admin/users.ejs`
- `views/admin/works.ejs`
- `views/admin/complaints.ejs`
- `views/admin/feedback.ejs`
- `views/admin/withdrawals.ejs`

## Как это работает

### Для обычных форм (блокировка/разблокировка пользователя, модерация работ, рассмотрение жалоб)

1. Пользователь нажимает кнопку действия в форме
2. JavaScript перехватывает отправку формы и сохраняет информацию об действии в `sessionStorage`
3. Форма отправляется на сервер обычным образом
4. Сервер обрабатывает действие и перенаправляет на ту же страницу
5. При загрузке страницы JavaScript проверяет `sessionStorage` и показывает уведомление
6. Уведомление автоматически закрывается через 4 секунды

### Для AJAX запросов (вывод средств)

1. Пользователь нажимает кнопку "Подтвердить" или "Отклонить"
2. JavaScript выполняет AJAX запрос к API
3. При успехе показывается модальное уведомление через `showAdminNotification()`
4. После закрытия уведомления страница перезагружается

## Использование в коде

### Для форм (автоматически)

Просто добавьте форму с методом POST в контейнер `.admin-container`:

```html
<form method="post" action="/admin/users/<%= user.id %>/block" class="inline-form">
    <input type="hidden" name="csrf_token" value="<%= csrfToken %>">
    <button class="small-btn danger-btn">Блокировать</button>
</form>
```

Система автоматически:
- Определит тип действия по URL
- Покажет уведомление с соответствующим сообщением
- Перезагрузит страницу

### Для AJAX запросов

Используйте функцию `showAdminNotification()`:

```javascript
async function approve(id) {
    try {
        const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken }
        });
        const data = await res.json();
        if (data.success) {
            showAdminNotification('Одобрено', 'Заявка на вывод одобрена', 'success', 2000);
            setTimeout(() => loadWithdrawals(), 2500);
        } else {
            showAdminNotification('Ошибка', data.error || 'Ошибка при одобрении', 'error', 0);
        }
    } catch (err) {
        showAdminNotification('Ошибка сети', 'Попробуйте снова', 'error', 0);
    }
}
```

### Для программной отправки уведомлений

```javascript
// Для форм (сохраняет в sessionStorage):
notifyAdminAction('user_blocked', 'Готово', 'Пользователь заблокирован');

// Для AJAX (показывает сразу):
showAdminNotification('Готово', 'Действие выполнено', 'success', 3000);
```

## API функций

### `showAdminNotification(title, message, type, duration)`
Показывает модальное уведомление

**Параметры:**
- `title` (string) - Заголовок уведомления
- `message` (string) - Текст сообщения
- `type` (string) - Тип: 'success', 'error', 'warning', 'info'
- `duration` (number) - Время автозакрытия в мс (0 = без автозакрытия)

**Пример:**
```javascript
showAdminNotification('Успешно', 'Пользователь заблокирован', 'success', 4000);
```

### `closeAdminNotification()`
Закрывает модальное уведомление

### `notifyAdminAction(actionType, customTitle, customMessage)`
Сохраняет уведомление в sessionStorage для отображения после перезагрузки

**Параметры:**
- `actionType` (string) - Тип действия (ключ из `notificationMessages`)
- `customTitle` (string, опционально) - Кастомный заголовок
- `customMessage` (string, опционально) - Кастомное сообщение

## Поддерживаемые типы действий

| Действие | Ключ | Сообщение |
|----------|------|-----------|
| Блокировка пользователя | `user_blocked` | Пользователь успешно заблокирован |
| Разблокировка пользователя | `user_unblocked` | Пользователь разблокирован |
| Одобрение работы | `work_approved` | Работа одобрена и опубликована |
| Отклонение работы | `work_rejected` | Работа отклонена |
| Рассмотрение жалобы | `complaint_resolved` | Жалоба рассмотрена |
| Одобрение вывода | `withdrawal_approved` | Заявка на вывод одобрена |
| Отклонение вывода | `withdrawal_rejected` | Заявка на вывод отклонена |

## Стили и оформление

Уведомления поддерживают 4 типа:
- **success** (зеленый) - успешное выполнение
- **error** (красный) - ошибка
- **warning** (оранжевый) - предупреждение  
- **info** (синий) - информационное

Каждый тип имеет свой цвет иконки и фона.

## Интеграция с существующим кодом

### Что автоматически работает:
✓ Все кнопки в таблицах админ-страниц с методом POST
✓ Формы блокировки/разблокировки пользователей
✓ Формы модерации работ
✓ Формы рассмотрения жалоб

### Что требует явного вызова:
- AJAX запросы (как в withdrawals.ejs)
- Кастомные действия не в списке выше

## Обновление сообщений

Чтобы добавить новый тип уведомления, отредактируйте объект `notificationMessages` в `admin-notification.js`:

```javascript
const notificationMessages = {
    'my_new_action': 'Мое новое сообщение',
    // ... остальные
};
```

Затем используйте его:
```javascript
notifyAdminAction('my_new_action');
```
