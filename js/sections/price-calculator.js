const SHOOT_RATE = 4500;

const EDIT_TIERS = {
    none: {
        name: 'БЕЗ МОНТАЖА',
        price: 0,
        suffix: '',
        details: [
            'передаем исходные материалы',
            'монтаж можно добавить позже'
        ]
    },
    basic: {
        name: 'БАЗОВЫЙ МОНТАЖ',
        price: 1500,
        suffix: '/ минута',
        details: [
            'отбор и сборка материала',
            'цветокоррекция и чистка звука',
            'субтитры при необходимости',
            'простые плашки и инфографика',
            '1 круг правок'
        ]
    },
    dynamic: {
        name: 'ДИНАМИЧНЫЙ МОНТАЖ',
        price: 3500,
        suffix: '/ минута',
        details: [
            'все из базового монтажа',
            'плотная работа с темпом',
            'акценты, b-roll и саунд-дизайн',
            'анимация титров и простой графики',
            '2 круга правок'
        ]
    }
};

const SHOOT_FEATURES = [
    'работа оператора',
    'камера и базовый комплект света',
    'запись чистого звука',
    'общие и детальные планы',
    'подготовка техники',
    'передача исходных материалов'
];

const MANUAL_OPTIONS = [
    { id: 'studio', name: 'СТУДИЯ ИЛИ ПЛАТНАЯ ЛОКАЦИЯ', note: 'по фактическому прайсу площадки' },
    { id: 'camera', name: 'ДОПОЛНИТЕЛЬНАЯ КАМЕРА / ОПЕРАТОР', note: 'рассчитаем отдельно' },
    { id: 'drone', name: 'АЭРОСЪЕМКА', note: 'рассчитаем отдельно' },
    { id: 'motion', name: 'СЛОЖНАЯ 2D / 3D-ГРАФИКА', note: 'рассчитаем отдельно' },
    { id: 'voice', name: 'ДИКТОРСКАЯ ОЗВУЧКА', note: 'рассчитаем отдельно' },
    { id: 'urgent', name: 'СРОЧНЫЙ МОНТАЖ', note: 'обсудим срок и доплату' }
];

const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

function getEditDiscount(minutes, tier) {
    if (tier === 'none') return 0;
    if (minutes >= 41) return 0.2;
    if (minutes >= 21) return 0.15;
    if (minutes >= 11) return 0.1;
    if (minutes >= 6) return 0.05;
    return 0;
}

export function initPriceCalculator() {
    const root = document.querySelector('[data-price-calculator]');
    if (!root || root.dataset.priceReady === 'true') return;
    root.dataset.priceReady = 'true';

    const options = root.querySelector('[data-price-options]');
    const total = root.querySelector('[data-price-total]');
    const shootCost = root.querySelector('[data-price-service]');
    const editCost = root.querySelector('[data-price-addons]');
    const discountCost = root.querySelector('[data-price-discount]');
    const selection = root.querySelector('[data-price-selection]');

    const state = {
        shootHours: 2,
        editTier: 'basic',
        editMinutes: 1,
        manualOptions: new Set()
    };

    function calculate() {
        const tier = EDIT_TIERS[state.editTier];
        const shoot = SHOOT_RATE * state.shootHours;
        const editBeforeDiscount = tier.price * state.editMinutes;
        const discountRate = getEditDiscount(state.editMinutes, state.editTier);
        const discount = editBeforeDiscount * discountRate;
        const edit = editBeforeDiscount - discount;

        return {
            tier,
            shoot,
            edit,
            discount,
            discountRate,
            total: shoot + edit
        };
    }

    function renderRange({ label, value, min, max, unit, key, note = '' }) {
        return `
            <div class="price-calculator__group">
                <span class="price-calculator__label">${label}</span>
                <div class="price-calculator__range">
                    <button type="button" data-price-step="-1" data-price-key="${key}" aria-label="Уменьшить значение">−</button>
                    <strong data-price-value="${key}">${value}</strong>
                    <input type="range" min="${min}" max="${max}" value="${value}" data-price-range="${key}" aria-label="${label}">
                    <button type="button" data-price-step="1" data-price-key="${key}" aria-label="Увеличить значение">+</button>
                    <span>${unit}</span>
                </div>
                ${note ? `<p class="price-calculator__hint">${note}</p>` : ''}
            </div>
        `;
    }

    function renderOptions() {
        const hasEdit = state.editTier !== 'none';
        options.innerHTML = `
            <div class="price-calculator__intro">
                <span>СЪЕМКА + МОНТАЖ</span>
                <p>Считаем проект по фактическому объему работы: часам на площадке и хронометражу готового видео.</p>
            </div>

            ${renderRange({
                label: `СЪЕМКА / ${money(SHOOT_RATE)} ЗА ЧАС`,
                value: state.shootHours,
                min: 0,
                max: 12,
                unit: 'ч',
                key: 'shootHours',
                note: 'Можно поставить 0, если нужен только монтаж ваших исходников.'
            })}

            <div class="price-calculator__included">
                <span class="price-calculator__label">В БАЗОВУЮ СЪЕМКУ ВХОДИТ</span>
                <div class="price-calculator__feature-list">
                    ${SHOOT_FEATURES.map((feature) => `<span>${feature}</span>`).join('')}
                </div>
            </div>

            <div class="price-calculator__group">
                <span class="price-calculator__label">МОНТАЖ ГОТОВОГО ВИДЕО</span>
                <div class="price-calculator__tiers">
                    ${Object.entries(EDIT_TIERS).map(([id, tier]) => `
                        <button type="button" class="price-calculator__tier${id === state.editTier ? ' is-active' : ''}" data-price-tier="${id}">
                            <span class="price-calculator__tier-name">${tier.name}</span>
                            <b>${tier.price ? money(tier.price) : '0 ₽'} <small>${tier.suffix}</small></b>
                            <span class="price-calculator__tier-lines">${tier.details.join(' / ')}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            ${hasEdit ? renderRange({
                label: 'ДЛИНА ГОТОВОГО ВИДЕО',
                value: state.editMinutes,
                min: 1,
                max: 60,
                unit: 'мин',
                key: 'editMinutes',
                note: 'На длинный монтаж применяется автоматическая скидка: до 20% в зависимости от хронометража.'
            }) : ''}

            <div class="price-calculator__group">
                <span class="price-calculator__label">ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ / СЧИТАЮТСЯ ОТДЕЛЬНО</span>
                <div class="price-calculator__addons">
                    ${MANUAL_OPTIONS.map((addon) => `
                        <label class="price-calculator__addon">
                            <input type="checkbox" value="${addon.id}" data-price-manual-option${state.manualOptions.has(addon.id) ? ' checked' : ''}>
                            <span>${addon.name}</span>
                            <b>${addon.note}</b>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderSummary() {
        const result = calculate();
        total.textContent = money(result.total);
        shootCost.textContent = money(result.shoot);
        editCost.textContent = money(result.edit);
        discountCost.textContent = `− ${money(result.discount)}`;

        const selectedManual = MANUAL_OPTIONS.filter((option) => state.manualOptions.has(option.id));
        const items = [
            `<div><span>СЪЕМКА</span><b>${state.shootHours} ч × ${money(SHOOT_RATE)}</b></div>`,
            `<div><span>${result.tier.name}</span><b>${state.editTier === 'none' ? 'не выбран' : `${state.editMinutes} мин`}</b></div>`,
            ...selectedManual.map((addon) => `<div><span>${addon.name}</span><b>отдельно</b></div>`)
        ];
        selection.innerHTML = items.join('');
    }

    function render() {
        renderOptions();
        renderSummary();
    }

    options.addEventListener('click', (event) => {
        const tier = event.target.closest('[data-price-tier]');
        if (tier) {
            state.editTier = tier.dataset.priceTier;
            render();
            return;
        }

        const step = event.target.closest('[data-price-step]');
        if (!step) return;
        const key = step.dataset.priceKey;
        const min = key === 'shootHours' ? 0 : 1;
        const max = key === 'shootHours' ? 12 : 60;
        state[key] = Math.min(max, Math.max(min, state[key] + Number(step.dataset.priceStep)));
        render();
    });

    options.addEventListener('input', (event) => {
        const key = event.target.dataset.priceRange;
        if (!key) return;
        state[key] = Number(event.target.value);
        const display = options.querySelector(`[data-price-value="${key}"]`);
        if (display) display.textContent = event.target.value;
        renderSummary();
    });

    options.addEventListener('change', (event) => {
        if (!event.target.matches('[data-price-manual-option]')) return;
        if (event.target.checked) state.manualOptions.add(event.target.value);
        else state.manualOptions.delete(event.target.value);
        renderSummary();
    });

    render();
}
