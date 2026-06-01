const SERVICES = {
    reels: {
        title: 'REELS / SHORTS',
        intro: 'Монтаж вертикальных роликов для ленты, рекламы и регулярного контента.',
        quantityLabel: 'Количество роликов',
        unit: 'рол.',
        min: 1,
        max: 20,
        value: 4,
        defaultTier: 'dynamic',
        tiers: [
            {
                id: 'basic',
                name: 'БАЗОВЫЙ',
                price: 1000,
                suffix: '/ ролик',
                details: ['нарезка исходников', 'статичные субтитры', 'базовый цвет и звук']
            },
            {
                id: 'dynamic',
                name: 'ДИНАМИЧНЫЙ',
                price: 3500,
                suffix: '/ ролик',
                details: ['акценты и анимация', 'b-roll / графика', '2 круга правок']
            }
        ],
        addons: [
            { id: 'script', name: 'ПОИСК ИДЕЙ / СЦЕНАРИЙ', price: 1500, perUnit: true },
            { id: 'cover', name: 'ОБЛОЖКА', price: 2000, perUnit: true }
        ],
        discount: ({ quantity, tier }) => tier.id === 'dynamic'
            ? quantity >= 20 ? 0.15 : quantity >= 15 ? 0.1 : quantity >= 10 ? 0.05 : 0
            : 0,
        discountHint: 'Динамичный монтаж: скидка 5% от 10 роликов, 10% от 15, 15% от 20.'
    },
    shoot: {
        title: 'ВИДЕОСЪЕМКА',
        intro: 'Съемочная смена в Томске и Северске: камера, свет и чистый звук.',
        quantityLabel: 'Количество часов',
        unit: 'ч',
        min: 1,
        max: 10,
        value: 2,
        defaultTier: 'dynamic',
        tiers: [
            {
                id: 'head',
                name: 'ИНТЕРВЬЮ / ПОДАЧА',
                price: 2500,
                suffix: '/ час',
                details: ['говорящая голова', 'профессиональный свет', 'запись звука']
            },
            {
                id: 'dynamic',
                name: 'ДИНАМИЧНАЯ',
                price: 5000,
                suffix: '/ час',
                details: ['несколько ракурсов', 'общие и детальные планы', 'движение камеры']
            }
        ],
        addons: [
            { id: 'studio', name: 'ПОДБОР СТУДИИ', price: 500 },
            { id: 'camera', name: 'ДОПОЛНИТЕЛЬНАЯ КАМЕРА', price: 1000 },
            { id: 'mua', name: 'ОРГАНИЗАЦИЯ ВИЗАЖИСТА', price: 1500 },
            { id: 'stylist', name: 'ОРГАНИЗАЦИЯ СТИЛИСТА', price: 1500 }
        ],
        discount: ({ quantity }) => quantity >= 3 ? 0.15 : 0,
        discountHint: 'Скидка 15% при заказе от 3 часов.'
    },
    edit: {
        title: 'ВИДЕОМОНТАЖ',
        intro: 'Монтаж длинных форматов, корпоративных видео, интервью и выпусков.',
        quantityLabel: 'Хронометраж готового видео',
        unit: 'мин',
        min: 3,
        max: 60,
        value: 5,
        defaultTier: 'standard',
        tiers: [
            {
                id: 'minimal',
                name: 'БАЗОВЫЙ',
                price: 1000,
                suffix: '/ минута',
                details: ['нарезка', 'простые вставки', 'базовый цвет и звук']
            },
            {
                id: 'standard',
                name: 'СТАНДАРТ',
                price: 1500,
                suffix: '/ минута',
                details: ['стилизация вставок', 'саунд-дизайн', 'детальная цветокоррекция']
            },
            {
                id: 'unique',
                name: 'АВТОРСКИЙ',
                price: 2500,
                suffix: '/ минута',
                details: ['моушн-дизайн', 'индивидуальные переходы', 'сложный звук и цвет']
            }
        ],
        addons: [
            { id: 'titles', name: 'АНИМИРОВАННЫЕ ТИТРЫ', price: 3000 },
            { id: 'subtitles', name: 'СУБТИТРЫ', price: 1500 },
            { id: 'urgent', name: 'СРОЧНЫЙ МОНТАЖ', rate: 0.5 }
        ],
        discount: () => 0
    },
    podcast: {
        title: 'ПОДКАСТЫ',
        intro: 'Монтаж и упаковка выпуска до 1,5 часов с возможностью добавить съемку.',
        quantityLabel: 'Количество выпусков',
        unit: 'вып.',
        min: 1,
        max: 8,
        value: 1,
        defaultTier: 'pro',
        tiers: [
            {
                id: 'standard',
                name: 'СТАНДАРТ',
                price: 15000,
                suffix: '/ выпуск',
                details: ['мультикамерная нарезка', 'синхронизация звука', 'плашки и таймкоды']
            },
            {
                id: 'pro',
                name: 'ПРОДВИНУТЫЙ',
                price: 25000,
                suffix: '/ выпуск',
                details: ['все из стандарта', 'цитаты и вставки', 'трейлер выпуска']
            }
        ],
        addons: [
            { id: 'shoot', name: 'СЪЕМКА ПОДКАСТА / 2 ЧАСА', price: 4500, perUnit: true },
            { id: 'studio', name: 'ПОДБОР СТУДИИ', price: 500 },
            { id: 'cover', name: 'ОБЛОЖКА ВЫПУСКА', price: 1500, perUnit: true },
            { id: 'reels', name: '4 ДИНАМИЧНЫХ REELS ИЗ ВЫПУСКА', price: 10500, perUnit: true }
        ],
        discount: () => 0
    },
    campaign: {
        title: 'РЕКЛАМА / КЛИПЫ',
        intro: 'Стартовый ориентир для проектов под ключ: от концепции до финального кадра.',
        quantityLabel: 'Количество роликов',
        unit: 'рол.',
        min: 1,
        max: 4,
        value: 1,
        defaultTier: 'promo',
        tiers: [
            {
                id: 'promo',
                name: 'ПРОМО-РОЛИК',
                price: 35000,
                suffix: 'от / ролик',
                details: ['концепция', 'съемка', 'монтаж и цвет']
            },
            {
                id: 'ad',
                name: 'РЕКЛАМНЫЙ РОЛИК',
                price: 50000,
                suffix: 'от / ролик',
                details: ['разработка подачи', 'продакшн', 'постпродакшн']
            },
            {
                id: 'clip',
                name: 'МУЗЫКАЛЬНЫЙ КЛИП',
                price: 60000,
                suffix: 'от / клип',
                details: ['визуальная концепция', 'съемочная команда', 'авторский монтаж']
            }
        ],
        addons: [
            { id: 'motion', name: 'АНИМИРОВАННАЯ ИНФОГРАФИКА', price: 7000 },
            { id: 'extraShift', name: 'ДОПОЛНИТЕЛЬНАЯ СМЕНА', price: 15000 },
            { id: 'sound', name: 'РАСШИРЕННЫЙ САУНД-ДИЗАЙН', price: 5000 }
        ],
        discount: () => 0,
        discountHint: 'Для рекламы и клипов цена указана от базовой конфигурации.'
    }
};

const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

export function initPriceCalculator() {
    const root = document.querySelector('[data-price-calculator]');
    if (!root || root.dataset.priceReady === 'true') return;
    root.dataset.priceReady = 'true';

    const options = root.querySelector('[data-price-options]');
    const total = root.querySelector('[data-price-total]');
    const serviceCost = root.querySelector('[data-price-service]');
    const addonsCost = root.querySelector('[data-price-addons]');
    const discountCost = root.querySelector('[data-price-discount]');
    const selection = root.querySelector('[data-price-selection]');
    const tabs = Array.from(root.querySelectorAll('[data-price-category]'));

    const state = Object.fromEntries(
        Object.entries(SERVICES).map(([id, service]) => [
            id,
            {
                tier: service.defaultTier,
                quantity: service.value,
                addons: new Set()
            }
        ])
    );
    let activeCategory = 'reels';

    function getActive() {
        return {
            config: SERVICES[activeCategory],
            current: state[activeCategory]
        };
    }

    function calculate() {
        const { config, current } = getActive();
        const tier = config.tiers.find((item) => item.id === current.tier) || config.tiers[0];
        const service = tier.price * current.quantity;
        let addons = 0;
        const selectedAddons = [];

        config.addons.forEach((addon) => {
            if (!current.addons.has(addon.id)) return;
            const addonCost = addon.rate
                ? service * addon.rate
                : addon.price * (addon.perUnit ? current.quantity : 1);
            addons += addonCost;
            selectedAddons.push({ ...addon, cost: addonCost });
        });

        const discount = service * config.discount({ quantity: current.quantity, tier });
        return {
            config,
            current,
            tier,
            service,
            addons,
            discount,
            selectedAddons,
            total: service + addons - discount
        };
    }

    function renderOptions() {
        const { config, current } = getActive();
        options.innerHTML = `
            <div class="price-calculator__intro">
                <span>${config.title}</span>
                <p>${config.intro}</p>
            </div>

            <div class="price-calculator__group">
                <span class="price-calculator__label">ВЫБЕРИТЕ ФОРМАТ</span>
                <div class="price-calculator__tiers">
                    ${config.tiers.map((tier) => `
                        <button type="button" class="price-calculator__tier${tier.id === current.tier ? ' is-active' : ''}" data-price-tier="${tier.id}">
                            <span class="price-calculator__tier-name">${tier.name}</span>
                            <b>${money(tier.price)} <small>${tier.suffix}</small></b>
                            <span class="price-calculator__tier-lines">${tier.details.join(' / ')}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="price-calculator__group">
                <span class="price-calculator__label">${config.quantityLabel.toUpperCase()}</span>
                <div class="price-calculator__range">
                    <button type="button" data-price-step="-1" aria-label="Уменьшить количество">−</button>
                    <strong data-price-quantity>${current.quantity}</strong>
                    <input type="range" min="${config.min}" max="${config.max}" value="${current.quantity}" data-price-range aria-label="${config.quantityLabel}">
                    <button type="button" data-price-step="1" aria-label="Увеличить количество">+</button>
                    <span>${config.unit}</span>
                </div>
                ${config.discountHint ? `<p class="price-calculator__hint">${config.discountHint}</p>` : ''}
            </div>

            <div class="price-calculator__group">
                <span class="price-calculator__label">ДОПОЛНИТЕЛЬНО</span>
                <div class="price-calculator__addons">
                    ${config.addons.map((addon) => `
                        <label class="price-calculator__addon">
                            <input type="checkbox" value="${addon.id}" data-price-addon${current.addons.has(addon.id) ? ' checked' : ''}>
                            <span>${addon.name}</span>
                            <b>${addon.rate ? `+${addon.rate * 100}%` : `+${money(addon.price)}${addon.perUnit ? ' / ед.' : ''}`}</b>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderSummary() {
        const result = calculate();
        total.textContent = money(result.total);
        serviceCost.textContent = money(result.service);
        addonsCost.textContent = money(result.addons);
        discountCost.textContent = `− ${money(result.discount)}`;

        const items = [
            `<div><span>${result.tier.name}</span><b>${result.current.quantity} ${result.config.unit}</b></div>`,
            ...result.selectedAddons.map((addon) => `<div><span>${addon.name}</span><b>${money(addon.cost)}</b></div>`)
        ];
        selection.innerHTML = items.join('');
    }

    function render() {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.priceCategory === activeCategory;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });
        renderOptions();
        renderSummary();
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            activeCategory = tab.dataset.priceCategory;
            render();
        });
    });

    options.addEventListener('click', (event) => {
        const tier = event.target.closest('[data-price-tier]');
        if (tier) {
            state[activeCategory].tier = tier.dataset.priceTier;
            render();
            return;
        }

        const step = event.target.closest('[data-price-step]');
        if (!step) return;
        const { config, current } = getActive();
        current.quantity = Math.min(config.max, Math.max(config.min, current.quantity + Number(step.dataset.priceStep)));
        render();
    });

    options.addEventListener('input', (event) => {
        if (!event.target.matches('[data-price-range]')) return;
        state[activeCategory].quantity = Number(event.target.value);
        const display = options.querySelector('[data-price-quantity]');
        if (display) display.textContent = event.target.value;
        renderSummary();
    });

    options.addEventListener('change', (event) => {
        if (!event.target.matches('[data-price-addon]')) return;
        const addons = state[activeCategory].addons;
        if (event.target.checked) addons.add(event.target.value);
        else addons.delete(event.target.value);
        renderSummary();
    });

    render();
}
