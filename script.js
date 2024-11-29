/*
 * Tanks to this : https://interpol.api.bund.dev/
 */
let notices = [];
let notice_infos = {};
let current_notice_id = null;

async function createNoticeElement(notice) {
    /* Get the notice link and ID */
    const noticeLink = notice._links;
    const noticeID = notice.entity_id;
    current_notice_id = noticeID;
    await fetchNoticeInfos(noticeID, noticeLink.self.href);

    /* Create the notice element */
    let html = `<article>`;
    
    /* Informations */
    if(noticeLink.thumbnail) html += `<img src="${noticeLink.thumbnail.href}" alt="${notice.forename} ${notice.name}">`;
    html += `<h2>${notice.forename} ${notice.name}</h2>`;
    const birthDate = new Date(notice.date_of_birth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    html += `<p>Birth of date : <span>${notice.date_of_birth} (Age : ${age})</span></p>`;
    html += `<p>Nationalities : <span>${notice.nationalities}</span></p>`;

    /* Deep informations */
    if(notice_infos[noticeID]) {
        const noticeInfos = notice_infos[noticeID];
        if(noticeInfos.languages_spoken_ids) html += `<p>Spoken langs : <span>${noticeInfos.languages_spoken_ids}</span></p>`;
        if(noticeInfos.height) html += `<p>Height : <span>${noticeInfos.height}</span></p>`;
        if(noticeInfos.weight) html += `<p>Weight : <span>${noticeInfos.weight}</span></p>`;
        if(noticeInfos.distinguishing_marks) html += `<p>Distinguishing marks : <span>${noticeInfos.distinguishing_marks}</span></p>`;

        const arrest_warrants = noticeInfos.arrest_warrants;
        if(arrest_warrants) {
            html += `<h3>Arrest warrants</h3>`;
            arrest_warrants.forEach(warrant => {
                // html += `<p>Charge : <span>${warrant.charge.replace('\n', '<br>').replace('\t', '').replace('*', '')}</span></p>`;
                html += `<p>Issuing country : <span>${warrant.issuing_country_id}</span></p>`;
            });
        }
    }

    /* Go to the official page */
    html += `<a href="https://www.interpol.int/fr/Notre-action/Notices/Notices-rouges/Voir-les-notices-rouges#${noticeID.replace('/', '-')}" target="_blank">More informations</a>`;
    html += `</article>`;

    /* Append the notice element */
    document.getElementById('results').innerHTML = html;
}

function searchNotices(form) {
    /* Popup alert */
    alert('Are you sure you want to search for notices? This will clear the previous results.');

    const data = new FormData(form);
    const url = new URL('https://ws-public.interpol.int/notices/v1/red');

    /* Filter empty values */
    const filteredData = { resultPerPage: 200, page: Math.floor(Math.random() * 10) + 1 };
    data.forEach((value, key) => {
        if (value.trim() !== "") filteredData[key] = value;
    });
    url.search = new URLSearchParams(filteredData).toString();

    /* Clear previous notices */
    notices = [];

    /* Fetch notices */
    fetch(url)
        .then(response => response.json())
        .then(data => {
            notices.push(...data._embedded.notices); // Add notices to the global array
            randomNotice(); // Create a random notice element
        });
}

async function fetchNoticeInfos(noticeID, url) {
    await fetch(url)
        .then(response => response.json())
        .then(data => notice_infos[noticeID] = data);
}

function checkNotice(form) {
    if(current_notice_id === null) return;

    const data = new FormData(form);
    const charge = data.get('charge');
    const infos = notice_infos[current_notice_id];

    if(!infos || !charge || infos.arrest_warrants.length === 0) {
        alert('No informations found for this notice.');
        return;
    }

    infos.arrest_warrants.forEach(warrant => {
        const hasCharge = warrant.charge.includes(charge);
        const chargeResult = document.getElementById('checkResult');
        const audio = new Audio(hasCharge ? './success.mp3' : './fail.mp3');

        chargeResult.innerHTML = hasCharge ? `This person is wanted for this charge!` : `This person is not wanted for this charge... Try again!`;
        chargeResult.style.color = hasCharge ? 'green' : 'red';
        if(hasCharge) document.getElementById('chargeContent').innerHTML = `Charge provided : ${warrant.charge}`;
        audio.play();
    });
}

document.addEventListener('submit', event => {
    event.preventDefault();
    switch (event.target.id) {
        case 'searchForm':
            searchNotices(event.target);
            break;
        case 'checkForm':
            checkNotice(event.target);
            break;
    }
});

function randomNotice() {
    const randomIndex = Math.floor(Math.random() * notices.length);
    createNoticeElement(notices[randomIndex]);
}