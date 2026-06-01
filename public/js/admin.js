(function () {
    function getModalParts() {
        return {
            modal: document.getElementById('confirmModal'),
            title: document.getElementById('confirmModalTitle'),
            message: document.getElementById('confirmModalMessage'),
            ok: document.getElementById('confirmModalOk'),
            cancel: document.getElementById('confirmModalCancel')
        };
    }

    window.closeConfirm = function closeConfirm() {
        const { modal, ok } = getModalParts();
        if (!modal) return;
        modal.style.display = 'none';
        modal.dataset.mode = '';
        if (ok) ok.onclick = null;
    };

    window.showConfirm = function showConfirm(message, onConfirm, options = {}) {
        const { modal, title, message: messageEl, ok, cancel } = getModalParts();
        if (!modal || !title || !messageEl || !ok || !cancel) {
            if (typeof onConfirm === 'function') onConfirm();
            return;
        }

        title.textContent = options.title || 'Подтвердите действие';
        messageEl.textContent = message || 'Вы уверены?';
        ok.textContent = options.confirmText || 'Подтвердить';
        cancel.textContent = options.cancelText || 'Отмена';
        cancel.style.display = options.hideCancel ? 'none' : '';
        ok.classList.toggle('danger-btn', Boolean(options.danger));
        modal.dataset.mode = options.hideCancel ? 'alert' : 'confirm';
        modal.style.display = 'flex';

        ok.onclick = () => {
            window.closeConfirm();
            if (typeof onConfirm === 'function') onConfirm();
        };
    };

    window.showAlert = function showAlert(message, options = {}) {
        window.showConfirm(message, () => {}, {
            title: options.title || 'Сообщение',
            confirmText: options.confirmText || 'Понятно',
            hideCancel: true,
            danger: options.danger
        });
    };

    window.confirmModalPromise = function confirmModalPromise(message, options = {}) {
        return new Promise((resolve) => {
            window.showConfirm(message, () => resolve(true), options);
            const { cancel, modal } = getModalParts();
            if (cancel) {
                cancel.onclick = () => {
                    window.closeConfirm();
                    resolve(false);
                };
            }
            const overlay = modal?.querySelector('.confirm-modal-overlay');
            if (overlay) {
                overlay.onclick = () => {
                    window.closeConfirm();
                    resolve(false);
                };
            }
        });
    };

    document.addEventListener('submit', (event) => {
        const form = event.target.closest('form[data-confirm]');
        if (!form || form.dataset.confirmed === 'true') return;

        event.preventDefault();
        window.showConfirm(form.dataset.confirm, () => {
            form.dataset.confirmed = 'true';
            form.requestSubmit();
        }, {
            title: form.dataset.confirmTitle || 'Подтвердите действие',
            confirmText: form.dataset.confirmText || 'Подтвердить',
            danger: form.dataset.confirmDanger === 'true'
        });
    });
})();
