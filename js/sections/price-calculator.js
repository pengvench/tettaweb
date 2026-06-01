const SHOOT_RATE = 4500;

const EDIT_TIERS = {
    none: { name: 'БЕЗ МОНТАЖА', price: 0 },
    basic: { name: 'БАЗОВЫЙ', price: 1500 },
    dynamic: { name: 'ДИНАМИЧНЫЙ', price: 3500 }
};

const PACKAGES = {
    promo: {
        name: 'ПРОМО-РОЛИК',
        intro: 'Короткое видео для продукта, услуги, события или презентации компании.',
        shootHours: 3,
        editTier: 'dynamic',
        editMinutes: 1,
        features: [
            'бриф и сценарный план',
            'съемка до 3 часов',
            'камера, свет и запись звука',
            'динамичный монтаж до 1 минуты',
            'цветокоррекция и саунд-дизайн',
            'простая графика и титры',
            '2 круга правок'
        ]
    },
    ad: {
        name: 'РЕКЛАМНЫЙ РОЛИК',
        intro: 'Имиджевое или продающее видео с более детальной проработкой подачи.',
        shootHours: 4,
        editTier: 'dynamic',
        editMinutes: 1,
        features: [
            'бриф и разработка подачи',
            'сценарный план',
            'съемка до 4 часов',
            'камера, свет и запись звука',
            'динамичный монтаж до 1 минуты',
            'цветокоррекция, звук и графика',
            '2 круга правок'
        ]
    },
    clip: {
        name: 'МУЗЫКАЛЬНЫЙ КЛИП',
        intro: 'Визуальная история для артиста: от обсуждения идеи до готового клипа.',
        shootHours: 6,
        editTier: 'dynamic',
        editMinutes: 4,
        features: [
            'обсуждение идеи и референсов',
            'сценарный план',
            'съемочная смена до 6 часов',
            'камера и базовый свет',
            'авторский монтаж до 4 минут',
            'цветокоррекция и саунд-дизайн',
            '2 круга правок'
        ]
    },
    interview: {
        name: 'ИНТЕРВЬЮ',
        intro: 'Разговорный формат для эксперта, команды или героя проекта.',
        shootHours: 2,
        editTier: 'basic',
        editMinutes: 10,
        features: [
            'подготовка площадки',
            'съемка до 2 часов',
            'камера, свет и запись звука',
            'монтаж интервью до 10 минут',
            'цветокоррекция и чистка звука',
            'титры и простые плашки',
            '1 круг правок'
        ]
    },
    podcast: {
        name: 'ПОДКАСТ',
        intro: 'Разговорный выпуск с аккуратной сборкой материала и чистым звуком.',
        shootHours: 3,
        editTier: 'basic',
        editMinutes: 30,
        features: [
            'подготовка площадки',
            'съемка до 3 часов',
            'камера, свет и запись звука',
            'монтаж выпуска до 30 минут',
            'цветокоррекция и чистка звука',
            'титры и простые плашки',
            '1 круг правок'
        ]
    },
    report: {
        name: 'ОТЧЕТНЫЙ РОЛИК',
        intro: 'Живое видео с мероприятия, открытия, выступления или события.',
        shootHours: 3,
        editTier: 'dynamic',
        editMinutes: 2,
        features: [
            'съемка события до 3 часов',
            'общие и детальные планы',
            'живые эмоции и атмосфера',
            'динамичный монтаж до 2 минут',
            'цветокоррекция и саунд-дизайн',
            'простые титры',
            '2 круга правок'
        ]
    },
    reels: {
        name: 'REELS / SHORTS',
        intro: 'Вертикальный ролик для бизнеса, эксперта или артиста.',
        shootHours: 1,
        editTier: 'dynamic',
        editMinutes: 1,
        features: [
            'идея и план кадров',
            'съемка до 1 часа',
            'вертикальный формат',
            'динамичный монтаж до 1 минуты',
            'субтитры и акценты',
            'простая графика',
            '2 круга правок'
        ]
    },
    shoot: {
        name: 'ТОЛЬКО СЪЕМКА',
        intro: 'Снимем материал и передадим исходники для дальнейшей работы.',
        shootHours: 2,
        editTier: 'none',
        editMinutes: 0,
        features: [
            'работа оператора',
            'камера и базовый свет',
            'запись чистого звука',
            'общие и детальные планы',
            'подготовка техники',
            'передача исходников'
        ]
    },
    edit: {
        name: 'ТОЛЬКО МОНТАЖ',
        intro: 'Соберем готовое видео из ваших исходных материалов.',
        shootHours: 0,
        editTier: 'basic',
        editMinutes: 5,
        features: [
            'отбор и сборка материала',
            'цветокоррекция',
            'чистка и выравнивание звука',
            'субтитры при необходимости',
            'простые плашки и инфографика',
            '1 круг правок'
        ]
    }
};

const MANUAL_OPTIONS = [
    'СТУДИЯ ИЛИ ПЛАТНАЯ ЛОКАЦИЯ',
    'ДОПОЛНИТЕЛЬНАЯ КАМЕРА / ОПЕРАТОР',
    'АЭРОСЪЕМКА',
    'СЛОЖНАЯ 2D / 3D-ГРАФИКА',
    'ДИКТОРСКАЯ ОЗВУЧКА',
    'СРОЧНЫЙ МОНТАЖ'
];

const EDIT_MINUTES = [0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 45, 60];
const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

function getEditDiscount(minutes, tier) {
    if (tier === 'none') return 0;
    if (minutes >= 41) return 0.5;
    if (minutes >= 21) return 0.35;
    if (minutes >= 11) return 0.2;
    if (minutes >= 6) return 0.1;
    return 0;
}

function option(value, label, active) {
    return `<option value="${value}"${String(value) === String(active) ? ' selected' : ''}>${label}</option>`;
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
        packageId: 'promo',
        shootHours: PACKAGES.promo.shootHours,
        editTier: PACKAGES.promo.editTier,
        editMinutes: PACKAGES.promo.editMinutes,
        manualOptions: new Set()
    };

    function calculate() {
        const tier = EDIT_TIERS[state.editTier];
        const shoot = SHOOT_RATE * state.shootHours;
        const editBeforeDiscount = tier.price * state.editMinutes;
        const discount = editBeforeDiscount * getEditDiscount(state.editMinutes, state.editTier);

        return {
            tier,
            shoot,
            edit: editBeforeDiscount - discount,
            discount,
            total: shoot + editBeforeDiscount - discount
        };
    }

    function applyPackage(packageId) {
        const selected = PACKAGES[packageId];
        state.packageId = packageId;
        state.shootHours = selected.shootHours;
        state.editTier = selected.editTier;
        state.editMinutes = selected.editMinutes;
    }

    function renderOptions() {
        const selected = PACKAGES[state.packageId];
        options.innerHTML = `
            <div class="price-calculator__controls">
                <label class="price-calculator__field price-calculator__field--wide">
                    <span>ТИП ПРОЕКТА</span>
                    <select data-price-package>
                        ${Object.entries(PACKAGES).map(([id, item]) => option(id, item.name, state.packageId)).join('')}
                    </select>
                </label>

                <label class="price-calculator__field">
                    <span>СЪЕМКА</span>
                    <select data-price-control="shootHours">
                        ${Array.from({ length: 13 }, (_, hours) => option(hours, `${hours} ч`, state.shootHours)).join('')}
                    </select>
                </label>

                <label class="price-calculator__field">
                    <span>МОНТАЖ</span>
                    <select data-price-control="editTier">
                        ${Object.entries(EDIT_TIERS).map(([id, tier]) => option(id, tier.name, state.editTier)).join('')}
                    </select>
                </label>

                <label class="price-calculator__field">
                    <span>ГОТОВОЕ ВИДЕО</span>
                    <select data-price-control="editMinutes"${state.editTier === 'none' ? ' disabled' : ''}>
                        ${EDIT_MINUTES.map((minutes) => option(minutes, `${minutes} мин`, state.editMinutes)).join('')}
                    </select>
                </label>
            </div>

            <div class="price-calculator__package">
                <div class="price-calculator__package-head">
                    <div>
                        <span>БАЗОВЫЙ ПАКЕТ</span>
                        <h3>${selected.name}</h3>
                    </div>
                    <b>от ${money(calculate().total)}</b>
                </div>
                <p>${selected.intro}</p>
                <div class="price-calculator__feature-list">
                    ${selected.features.map((feature) => `<span>${feature}</span>`).join('')}
                </div>
            </div>

            <details class="price-calculator__extras">
                <summary>ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ <span>раскрыть +</span></summary>
                <p>Отметьте нужное. Эти пункты зависят от задачи и не прибавляют выдуманную фиксированную цену.</p>
                <div class="price-calculator__addons">
                    ${MANUAL_OPTIONS.map((name) => `
                        <label class="price-calculator__addon">
                            <input type="checkbox" value="${name}" data-price-manual-option${state.manualOptions.has(name) ? ' checked' : ''}>
                            <span>${name}</span>
                            <b>отдельно</b>
                        </label>
                    `).join('')}
                </div>
            </details>

            <p class="price-calculator__hint">
                Съемка считается по ${money(SHOOT_RATE)} за час. На длинный монтаж автоматически применяется скидка до 50%.
            </p>
        `;
    }

    function renderSummary() {
        const result = calculate();
        total.textContent = money(result.total);
        shootCost.textContent = money(result.shoot);
        editCost.textContent = money(result.edit);
        discountCost.textContent = `− ${money(result.discount)}`;

        const selected = PACKAGES[state.packageId];
        const items = [
            `<div><span>${selected.name}</span><b>базовый пакет</b></div>`,
            `<div><span>СЪЕМКА</span><b>${state.shootHours} ч × ${money(SHOOT_RATE)}</b></div>`,
            `<div><span>${result.tier.name}</span><b>${state.editTier === 'none' ? 'не выбран' : `${state.editMinutes} мин`}</b></div>`,
            ...Array.from(state.manualOptions).map((name) => `<div><span>${name}</span><b>отдельно</b></div>`)
        ];
        selection.innerHTML = items.join('');
    }

    function render() {
        renderOptions();
        renderSummary();
    }

    options.addEventListener('change', (event) => {
        if (event.target.matches('[data-price-package]')) {
            applyPackage(event.target.value);
            render();
            return;
        }

        const key = event.target.dataset.priceControl;
        if (key) {
            state[key] = key === 'editTier' ? event.target.value : Number(event.target.value);
            if (key === 'editTier' && state.editTier === 'none') state.editMinutes = 0;
            if (key === 'editTier' && state.editTier !== 'none' && state.editMinutes === 0) state.editMinutes = 1;
            render();
            return;
        }

        if (!event.target.matches('[data-price-manual-option]')) return;
        if (event.target.checked) state.manualOptions.add(event.target.value);
        else state.manualOptions.delete(event.target.value);
        renderSummary();
    });

    render();
}
