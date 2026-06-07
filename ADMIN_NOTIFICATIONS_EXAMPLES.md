# Примеры использования системы модальных уведомлений

## Пример 1: Блокировка пользователя

**HTML форма в админ-панели:**
```html
<form method="post" action="/admin/users/<%= user.id %>/block" class="inline-form">
    <input type="hidden" name="csrf_token" value="<%= csrfToken %>">
    <input type="hidden" name="reason" value="Нарушение правил">
    <button class="small-btn danger-btn">Блокировать</button>
</form>
```

**Что происходит:**
1. Пользователь нажимает "Блокировать"
2. JavaScript сохраняет в sessionStorage: `{ title: 'Успешно', message: 'Пользователь успешно заблокирован', type: 'success' }`
3. Форма отправляется на сервер
4. Сервер обрабатывает и перенаправляет на `/admin/users`
5. При загрузке страницы показывается модальное окно с уведомлением
6. Окно автоматически закрывается через 4 секунды

---

## Пример 2: Модерация работы

**HTML форма в админ-панели:**
```html
<form method="post" action="/admin/works/<%= work.id %>/moderate" class="inline-form">
    <input type="hidden" name="csrf_token" value="<%= csrfToken %>">
    <input type="hidden" name="status" value="active">
    <button class="small-btn">Одобрить</button>
</form>
```

**Результат:**
- При отправке форма со `status=active` = уведомление "Работа одобрена и опубликована"
- При отправке формы с `status=cancelled` = уведомление "Работа отклонена"

---

## Пример 3: Вывод средств (AJAX)

**JavaScript в withdrawals.ejs:**
```javascript
async function approve(id) {
    if (!confirm('Подтвердить вывод средств?')) return;
    try {
        const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken }
        });
        const data = await res.json();
        if (data.success) {
            // Показать уведомление сразу
            showAdminNotification('Одобрено', 'Заявка на вывод одобрена', 'success', 2000);
            
            // Перезагрузить данные через 2.5 секунды
            setTimeout(() => loadWithdrawals(), 2500);
        } else {
            showAdminNotification('Ошибка', data.error || 'Ошибка при одобрении', 'error', 0);
        }
    } catch (err) {
        showAdminNotification('Ошибка сети', 'Попробуйте снова', 'error', 0);
    }
}
```

---

## Пример 4: Добавление нового типа действия

### Шаг 1: Добавить сообщение в `admin-notification.js`
```javascript
const notificationMessages = {
    // ... существующие сообщения
    'custom_action': 'Мое кастомное действие выполнено успешно',
};
```

### Шаг 2: Добавить форму в админ-страницу
```html
<form method="post" action="/admin/custom/<%= id %>/action" class="inline-form">
    <input type="hidden" name="csrf_token" value="<%= csrfToken %>">
    <button class="small-btn">Выполнить действие</button>
</form>
```

### Шаг 3: Добавить логику определения типа в setupAdminFormNotifications()
```javascript
if (action.includes('/custom') && action.includes('/action')) {
    actionType = 'custom_action';
}
```

Готово! Теперь при клике на кнопку будет показано уведомление.

---

## Пример 5: Уведомление с кастомным текстом

```javascript
// Вместо стандартного сообщения показать свое
notifyAdminAction('user_blocked', 'Готово!', 'Пользователь был заблокирован вручную');
```

---

## Типы уведомлений и цвета

### Success (зеленый)
```javascript
showAdminNotification('Успешно', 'Действие выполнено', 'success');
```

### Error (красный)
```javascript
showAdminNotification('Ошибка', 'Что-то пошло не так', 'error', 0);
// 0 = не закрывается автоматически
```

### Warning (оранжевый)
```javascript
showAdminNotification('Внимание', 'Проверьте данные', 'warning');
```

### Info (синий)
```javascript
showAdminNotification('Информация', 'Действие выполняется', 'info');
```

---

## Отладка

### Проверить содержимое sessionStorage
```javascript
// В консоли браузера
sessionStorage.getItem('adminActionNotification');
```

### Вручную показать уведомление
```javascript
// В консоли браузера
showAdminNotification('Тест', 'Это тестовое уведомление', 'success');
```

### Проверить что функции определены
```javascript
// В консоли браузера
typeof showAdminNotification; // "function"
typeof setupAdminFormNotifications; // "function"
```

---

## Интеграция с серверной частью

Серверная часть НЕ требует изменений! Система полностью работает на клиенте через:
1. sessionStorage для форм с redirect
2. Прямой вызов функций для AJAX запросов

Сервер просто обрабатывает действие и перенаправляет как обычно.
