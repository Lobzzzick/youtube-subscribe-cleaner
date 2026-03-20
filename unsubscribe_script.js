// ИСПРАВЛЕННЫЙ СКРИПТ ДЛЯ ОТПИСКИ ОТ YOUTUBE (работает с новым интерфейсом)
console.log('YouTube Unsubscribe Script');

async function massUnsubscribe() {
    console.log('Начинаем поиск каналов для отписки');

    // Функция для прокрутки и загрузки всех каналов
    async function loadAllChannels() {
        console.log('Загружаем все каналы');

        let previousHeight = 0;
        let currentHeight = document.body.scrollHeight;
        let attempts = 0;
        const maxAttempts = 20;

        while (previousHeight !== currentHeight && attempts < maxAttempts) {
            previousHeight = currentHeight;

            // Прокручиваем до конца
            window.scrollTo(0, document.body.scrollHeight);

            // Ждем загрузки
            await new Promise(resolve => setTimeout(resolve, 2500));

            currentHeight = document.body.scrollHeight;
            attempts++;

            console.log(`Прокрутка ${attempts}/${maxAttempts}, высота: ${currentHeight}px`);
        }

        console.log('Все каналы загружены');
    }

    // НОВАЯ функция поиска кнопки подтверждения
    async function findConfirmButton() {
        // Увеличенное время ожидания для появления диалога
        await new Promise(resolve => setTimeout(resolve, 500));

        const confirmSelectors = [
            // Русские варианты
            'button:contains("Отказаться от подписки")',
            'button[aria-label*="Отказаться от подписки"]',
            'button:has([role="text"]):contains("Отказаться от подписки")',

            // Английские варианты
            'button:contains("Unsubscribe")',
            'button[aria-label*="Unsubscribe"]',

            // По цвету (синяя кнопка)
            'button[style*="background-color"]',
            '.yt-spec-button-shape-next--filled',
            'ytd-button-renderer[is-paper-button] button',

            // Универсальные селекторы для диалогов
            'ytd-confirmation-dialog-renderer button:last-child',
            'paper-dialog button:last-child',
            '#confirm-button',
            '[role="dialog"] button[style*="rgb"]'
        ];

        // Пробуем найти кнопку разными способами
        for (const selector of confirmSelectors) {
            try {
                if (selector.includes(':contains')) {
                    // Для :contains используем альтернативный поиск
                    const text = selector.includes('Отказаться от подписки') ? 'Отказаться от подписки' : 'Unsubscribe';
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const found = buttons.find(btn =>
                        btn.textContent.trim().includes(text) &&
                        btn.offsetParent !== null
                    );
                    if (found) return found;
                } else {
                    const element = document.querySelector(selector);
                    if (element && element.offsetParent !== null) {
                        return element;
                    }
                }
            } catch (e) {
                // Продолжаем поиск при ошибке
            }
        }

        // Последняя попытка - ищем любую синюю кнопку в диалоге
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const style = window.getComputedStyle(btn);
            const bgColor = style.backgroundColor;
            const text = btn.textContent.toLowerCase();

            if ((bgColor.includes('rgb(') && !bgColor.includes('rgb(0, 0, 0)')) ||
                text.includes('отказаться') ||
                text.includes('unsubscribe')) {
                if (btn.offsetParent !== null) {
                    return btn;
                }
            }
        }

        return null;
    }

    // ИСПРАВЛЕННАЯ функция поиска кнопок отписки
    function findUnsubscribeButtons() {
        console.log('Ищем кнопки с новыми селекторами...');

        // Более точные селекторы для поиска ТОЛЬКО кнопок отписки
        const selectors = [
            // Точные селекторы для отписки (исключаем подписку)
            'button[aria-label*="Отменить подписку"][aria-pressed="true"]',
            'button[aria-label*="отменить подписку"][aria-pressed="true"]',
            'button[aria-label*="ОТМЕНИТЬ ПОДПИСКУ"][aria-pressed="true"]',
            'button[aria-label*="Unsubscribe"][aria-pressed="true"]',
            
            // Альтернативные точные селекторы
            'button[aria-label*="Отменить подписку на"]',
            'button[aria-label*="Unsubscribe from"]',
            
            // Селекторы по структуре (только уже подписанные каналы)
            'ytd-subscribe-button-renderer[subscribed] button',
            'ytd-subscription-notification-toggle-button-renderer button[aria-label*="Отменить"]'
        ];

        let buttons = [];

        // Собираем кнопки по всем селекторам
        selectors.forEach(selector => {
            try {
                const found = Array.from(document.querySelectorAll(selector));
                found.forEach(button => {
                    // Проверяем, что кнопка видима, не добавлена и имеет нужный текст
                    if (button.offsetParent !== null &&
                        !buttons.includes(button) &&
                        button.getAttribute('aria-label') &&
                        !button.disabled) {

                        const label = button.getAttribute('aria-label').toLowerCase();
                        const text = button.textContent.toLowerCase();

                        // СТРОГАЯ проверка - только кнопки отписки (НЕ подписки)
                        if ((label.includes('отменить подписку') || label.includes('unsubscribe')) &&
                            !label.includes('подписаться') && !label.includes('subscribe to') &&
                            !text.includes('подписаться') && !text.includes('subscribe')) {
                            buttons.push(button);
                        }
                    }
                });
            } catch (e) {
                console.log(`Ошибка с селектором ${selector}:`, e.message);
            }
        });

        // Удаляем дубликаты
        buttons = [...new Set(buttons)];

        // Дополнительная фильтрация по классам (из диагностики)
        const filteredButtons = buttons.filter(btn => {
            const classes = btn.className;
            return classes.includes('yt-spec-button-shape-next');
        });

        console.log(`Найдено кнопок: ${buttons.length}, после фильтрации: ${filteredButtons.length}`);

        return filteredButtons.length > 0 ? filteredButtons : buttons;
    }

    // Основной процесс отписки
    try {
        // Загружаем все каналы
        await loadAllChannels();

        // Ищем кнопки отписки
        let buttons = findUnsubscribeButtons();

        console.log(`Найдено ${buttons.length} каналов для отписки`);

        if (buttons.length === 0) {
            console.log('Кнопки отписки не найдены!');

            // Пробуем альтернативный поиск
            console.log('Пробуем альтернативный поиск...');
            const alternativeButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                const label = btn.getAttribute('aria-label') || '';
                const text = btn.textContent || '';
                return label.toLowerCase().includes('отменить подписку') ||
                    text.toLowerCase().includes('вы подписаны');
            });

            if (alternativeButtons.length > 0) {
                console.log(`Альтернативный поиск нашел: ${alternativeButtons.length} кнопок`);
                // Обрабатываем найденные кнопки вместо простого возврата
                buttons = alternativeButtons;
            } else {

                console.log('Попробуйте:');
                console.log('   1. Обновить страницу');
                console.log('   2. Прокрутить вниз для загрузки каналов');
                console.log('   3. Проверить, что вы на странице /feed/channels');
                return;
            }
        }

        // Подтверждение от пользователя
        const confirm = window.confirm(
            `Найдено ${buttons.length} подписок для отмены.\n\n` +
            `Вы уверены, что хотите ОТПИСАТЬСЯ от ВСЕХ каналов?\n` +
            `Это действие нельзя будет отменить!\n\n` +
            `Каналы: ${buttons.length}`
        );

        if (!confirm) {
            console.log('Отписка отменена пользователем');
            return;
        }

        console.log('Начинаем процесс отписки...');

        let successful = 0;
        let failed = 0;

        // Отписываемся от каждого канала
        for (let i = 0; i < buttons.length; i++) {
            try {
                const button = buttons[i];
                const channelName = button.getAttribute('aria-label') || `Канал ${i + 1}`;

                // Сохраняем исходное состояние кнопки
                const originalAriaLabel = button.getAttribute('aria-label');
                const originalText = button.textContent.trim();

                // Прокручиваем к кнопке
                button.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                // Увеличенная задержка для прокрутки
                await new Promise(resolve => setTimeout(resolve, 800));

                // Кликаем по кнопке отписки
                button.click();

                // Увеличенная задержка для появления диалога
                await new Promise(resolve => setTimeout(resolve, 600));

                // Ищем и нажимаем кнопку подтверждения
                const confirmButton = await findConfirmButton();
                if (confirmButton) {
                    confirmButton.click();
                    
                    // Ждем применения изменений
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // ПРОВЕРЯЕМ успешность отписки по изменению aria-label
                    const newAriaLabel = button.getAttribute('aria-label');
                    const newText = button.textContent.trim();
                    
                    // Проверяем изменение состояния кнопки
                    const isUnsubscribed = 
                        (originalAriaLabel && newAriaLabel && originalAriaLabel !== newAriaLabel) ||
                        (originalText && newText && originalText !== newText) ||
                        newAriaLabel?.includes('Подписаться') ||
                        newAriaLabel?.includes('Subscribe') ||
                        newText.includes('Подписаться');
                    
                    if (isUnsubscribed) {
                        successful++;
                        console.log(`${successful}/${buttons.length} - ${channelName.substring(0, 50)}... ОТПИСКА ПОДТВЕРЖДЕНА`);
                    } else {
                        console.log(`${i + 1} - Отписка не подтвердилась для: ${channelName.substring(0, 50)}...`);
                        failed++;
                    }
                } else {
                    console.log(`${i + 1} - Кнопка подтверждения не найдена для: ${channelName.substring(0, 50)}...`);
                    failed++;
                }

                // Увеличенная задержка между кликами
                const delay = Math.random() * 600 + 1200; // 1200-1800ms (значительно увеличили)
                await new Promise(resolve => setTimeout(resolve, delay));

                // Длинная пауза каждые 15 отписок
                /*if (successful % 15 === 0) {
                    console.log('Пауза 4 секунды...');
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }*/

            } catch (error) {
                failed++;
                console.log(`Ошибка при отписке ${i + 1}:`, error.message);
            }
        }

        // Итоговый результат
        console.log('\n ПРОЦЕСС ЗАВЕРШЕН!');
        console.log(`Успешных отписок: ${successful}`);
        console.log(`Ошибок: ${failed}`);
        console.log(`Общий результат: ${successful}/${buttons.length}`);

        if (successful > 0) {
            console.log('\n Обновляем страницу через 6 секунд для проверки результатов...');
            setTimeout(() => {
                window.location.reload();
            }, 6000);
        }

    } catch (error) {
        console.error('Критическая ошибка:', error);
    }
}

// Функция для частичной отписки (безопаснее для начала)
async function partialUnsubscribe(limit = 50) {
    console.log(`Частичная отписка от первых ${limit} каналов...`);

    const buttons = Array.from(document.querySelectorAll('button[aria-label*="Отменить подписку"]')).slice(0, limit);

    if (buttons.length === 0) {
        console.log('Кнопки отписки не найдены');
        return;
    }

    console.log(`Будет обработано: ${buttons.length} каналов`);

    let successful = 0;

    for (let i = 0; i < buttons.length; i++) {
        try {
            const button = buttons[i];
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 400));

            // Кликаем по кнопке отписки
            button.click();

            // Ждем диалог и ищем кнопку подтверждения
            await new Promise(r => setTimeout(r, 300));

            const confirmButton = Array.from(document.querySelectorAll('button')).find(btn =>
                btn.textContent.includes('Отказаться от подписки') && btn.offsetParent !== null
            );

            if (confirmButton) {
                confirmButton.click();
                successful++;
                console.log(`Отписка ${successful}/${buttons.length} ПОДТВЕРЖДЕНА`);
            } else {
                console.log(`Кнопка подтверждения не найдена для отписки ${i + 1}`);
            }

            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.log(`Ошибка ${i + 1}:`, e.message);
        }
    }

    console.log(`Частичная отписка завершена! Успешно: ${successful}/${buttons.length}`);
}

// ЗАПУСК СКРИПТА
console.log('\nДоступные команды (ИСПРАВЛЕННЫЕ):');
console.log('1. massUnsubscribeFixed() - Отписаться от ВСЕХ каналов');
console.log('2. partialUnsubscribeFixed(100) - Отписаться от первых 100 каналов');
console.log('\n Рекомендация: сначала попробуйте partialUnsubscribeFixed(20) для теста');

// Показываем статистику
const totalButtons = document.querySelectorAll('button[aria-label*="Отменить подписку"]').length;
console.log(`\n Обнаружено подписок: ${totalButtons}`);

console.log('\n Автозапуск отключен. Запустите вручную нужную команду.');
console.log(' Для теста: partialUnsubscribeFixed(5)');
console.log(' Для всех: massUnsubscribeFixed()');

