const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('clear')) {
    localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
    document.getElementById('question').innerText = 'Cleared local storage!';
}

var renderReadBtn = document.getElementById('renderReader');

if (!window.localStorage.getItem('consent')) {
    renderReadBtn.disabled = true;
    document.getElementById('consent').addEventListener('click', function() {
        window.localStorage.setItem('consent', 'true');
        document.getElementById('notice').classList.add('display-none');
        renderReadBtn.disabled = false;
    });
}
else document.getElementById('notice').classList.add('display-none');

const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    rememberLastUsedCamera: true,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
};

const html5QrCode = new Html5Qrcode("reader");
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    try { stopCamera(renderReadBtn); }
    catch (err) { console.log(err); }
    renderReadBtn.setAttribute('aria-label', renderReadBtn.dataset.open);
    readerContainer.classList.add('display-none');
    loadQuestion(decodedText);
};

var readerContainer = document.getElementById('reader');
renderReadBtn.addEventListener('click', async function() {
    if (readerContainer.classList.toggle('display-none')) {
        try { stopCamera(this); }
        catch (err) { console.log(err); }
        renderReadBtn.setAttribute('aria-label', renderReadBtn.dataset.open);
    }
    else {
        this.disabled = true;

        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback).then(() => {
            if (html5QrCode.getState() === 2) {
                renderReadBtn.setAttribute('aria-label', renderReadBtn.dataset.close);
                this.disabled = false;
                window.scrollTo(0, 0);
            }
        })
        .catch((err) => {
            console.log(err);
            readerContainer.classList.add('display-none')
            this.disabled = false;
        });
    }
});

document.getElementById('reveal').addEventListener('click', function() {
    document.getElementById('answer').classList.add('revealed');
    this.disabled = true;
});

function stopCamera(btn) {
    btn.disabled = true;

    html5QrCode.stop().then(() => {
        html5QrCode.clear();
        btn.disabled = false;
    })
    .catch((err) => {
        console.log(err);
        btn.disabled = false;
    });
}

async function loadQuestion(url) {
    const response = await fetch(url);
    const collData = await response.json();

    let storageData = JSON.parse(localStorage.getItem(url));

    if (!storageData) {
        localStorage.setItem(url, JSON.stringify({
            'draw': [...Array(collData.questions.length).keys()] // draw card pile
        }));

        storageData = JSON.parse(localStorage.getItem(url));
    }

    let question = getRandomQuestion(collData, url, storageData);
    renderQuestion(question, collData.title);
}

async function renderQuestion(question, title) {
    let titleElem = document.getElementById('title');

    if (title) {
        titleElem.innerText = title;
        titleElem.classList.remove('display-none');
    }
    else titleElem.classList.add('display-none');

    let qnElem = document.getElementById('question');
    qnElem.innerText = question.text;

    if (question.text.length > 100) qnElem.classList.add('long');
    else qnElem.classList.remove('long');

    let ansLen = 0;
    let ansElem = document.getElementById('alternatives');
    while (ansElem.firstChild) ansElem.removeChild(ansElem.firstChild);

    for (let i = 0; i < question.alternatives.length; i++) {
        let li = document.createElement('li');

        let text = document.createTextNode(question.alternatives[i].text);
        li.append(text);
        ansLen += text.length;

        if (i + 1 == question.answer) li.setAttribute('id', 'answer');
        ansElem.appendChild(li);
    }

    if (ansLen > 100) ansElem.classList.add('long');
    else ansElem.classList.remove('long');

    document.getElementById('reveal').disabled = false;
}

function getRandomQuestion(collData, key, storageData) {
    if (!storageData.draw.length) storageData.draw = [...Array(collData.questions.length).keys()];

    let i = Math.floor(Math.random() * storageData.draw.length);
    let n = storageData.draw[i];

    storageData.draw.splice(i, 1);
    localStorage.setItem(key, JSON.stringify(storageData));
    return collData.questions[n];
}
