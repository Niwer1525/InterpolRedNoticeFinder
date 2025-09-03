/*
 * Tanks to this : https://interpol.api.bund.dev/
 */
const state = {
    notices: [],
    noticeInfos: {},
    currentNoticeId: null
};

/**
 * Fetch notice information from the API.
 * @param {string} noticeID - The ID of the notice.
 * @param {string} url - The API endpoint URL.
 */
async function fetchNoticeInfos(noticeID, url) {
    try {
        state.noticeInfos[noticeID] = await (await fetch(url)).json();
    } catch {
        state.noticeInfos[noticeID] = null;
    }
}

/**
 * Select a random notice from the state and create its HTML element.
 */
function randomNotice() {
    if (state.notices.length) createNoticeElement(state.notices[Math.random() * state.notices.length | 0]);
}

/**
 * Create an HTML element for a notice.
 * @param {*} notice 
 */
async function createNoticeElement(notice) {
    const { _links: l, entity_id: id, forename, name, date_of_birth, nationalities } = notice;
    state.currentNoticeId = id;
    if (!state.noticeInfos[id]) await fetchNoticeInfos(id, l.self.href);
    const info = state.noticeInfos[id] || {}, birth = new Date(date_of_birth), age = new Date().getFullYear() - birth.getFullYear();
    document.getElementById('results').innerHTML = `
        <article>
            ${l.thumbnail ? `<img src="${l.thumbnail.href}" alt="${forename} ${name}">` : ''}
            <h2>${forename} ${name}</h2>
            <p>Birth of date : <span>${date_of_birth} (Age : ${age})</span></p>
            <p>Nationalities : <span>${nationalities}</span></p>
            ${info.languages_spoken_ids ? `<p>Spoken langs : <span>${info.languages_spoken_ids}</span></p>` : ''}
            ${info.height ? `<p>Height : <span>${info.height}</span></p>` : ''}
            ${info.weight ? `<p>Weight : <span>${info.weight}</span></p>` : ''}
            ${info.distinguishing_marks ? `<p>Distinguishing marks : <span>${info.distinguishing_marks}</span></p>` : ''}
            ${info.arrest_warrants?.length ? `<h3>Arrest warrants</h3>${info.arrest_warrants.map(w => `<p>Issuing country : <span>${w.issuing_country_id}</span></p>`).join('')}` : ''}
            <a href="https://www.interpol.int/fr/Notre-action/Notices/Notices-rouges/Voir-les-notices-rouges#${id.replace('/', '-')}" target="_blank">More informations</a>
        </article>
    `;
}

/**
 * This will ask the Interpol API for notices based on the provided form data.
 * @param {*} form  The form element containing the search criteria.
 */
async function searchNotices(form) {
    if (!confirm('Search for notices?')) return;
    const data = new FormData(form), url = new URL('https://ws-public.interpol.int/notices/v1/red');
    url.search = new URLSearchParams({ resultPerPage: 200, page: Math.floor(Math.random() * 10) + 1, ...Object.fromEntries([...data].filter(([_, v]) => v.trim())) });
    state.notices = [];
    try {
        const res = await fetch(url), json = await res.json();
        if (json._embedded?.notices?.length) {
            state.notices.push(...json._embedded.notices);
            randomNotice();
        } else document.getElementById('results').innerHTML = '<p>No notices found.</p>';
    } catch {
        document.getElementById('results').innerHTML = '<p>Error fetching notices.</p>';
    }
}

/**
 * Translate a text using the local translation API.
 * @param {*} params  The text to translate.
 * @returns  The translated text or the original text if translation fails.
 */
async function translate(params) { //TODO Lire translate cannot be host on github pages so I've disabled this. This may cause issues when playing
    // try {
    //     // Try to translate from auto to english
    //     const response = await fetch("https://libretranslate.com/translate", {
    //         method: "POST",
    //         body: JSON.stringify({
    //             q: params,
    //             source: "auto",
    //             target: "en",
    //             format: "text"
    //         }),
    //         headers: { "Content-Type": "application/json" }
    //     });
    //     const data = await response.json();
    //     return data.translatedText;
    // } catch (e) {
    //     return params; // Return original text if translation fails
    // }
    return params;
}

/**
 * Check if a notice matches the provided form data.
 * @param {*} form  The form element containing the charge to check.
 */
async function checkNotice(form) {
    if (!state.currentNoticeId) return;
    const data = new FormData(form), charge = data.get('charge')?.toLowerCase();
    const infos = state.noticeInfos[state.currentNoticeId], warrants = infos?.arrest_warrants || [];
    const chargeResult = document.getElementById('checkResult'), chargeContent = document.getElementById('chargeContent');
    let found = false;
    let matchedCharge = '';
    for (const w of warrants) {
        const translated = (await translate(w.charge)).toLowerCase();
        if (charge && translated.includes(charge)) {
            found = true;
            matchedCharge = translated;
            break;
        }
    }
    if (found) { //TODO this can be optimized but i'm too lazy...
        chargeResult.innerHTML = 'This person is wanted for this charge!';
        chargeResult.style.color = 'green';
        chargeContent.innerHTML = `Charge provided : ${matchedCharge}`;
        new Audio('./success.mp3').play();
        chargeResult.classList.replace('shake', 'pulse');
        setTimeout(() => chargeResult.classList.remove('pulse'), 1200);
    } else {
        chargeResult.innerHTML = 'This person is not wanted for this charge... Try again!';
        chargeResult.style.color = 'red';
        chargeContent.innerHTML = '';
        new Audio('./fail.mp3').play();
        chargeResult.classList.replace('pulse', 'shake');
        setTimeout(() => chargeResult.classList.remove('shake'), 800);
    }
}

function resetFilterForm() {
    if (confirm('Reset form and clear results?')) {
        ['searchForm', 'results', 'checkResult', 'chargeContent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) id === 'searchForm' ? el.reset() : el.innerHTML = '';
        });
        Object.assign(state, { notices: [], noticeInfos: {}, currentNoticeId: null });
    }
}

document.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id === 'searchForm') searchNotices(event.target);
    else if (event.target.id === 'checkForm') checkNotice(event.target);
});