// ==================================================
// GLOBALS
// ==================================================
let channels = [];
let shakaPlayer = null;

// ==================================================
// FETCH CHANNEL DATA
// ==================================================
async function loadChannels() {
  try {
    const res = await fetch("chn.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch channels");
    channels = await res.json();
    render();
  } catch (err) {
    console.error("Channel fetch error:", err);
    document.getElementById("channelSections").innerHTML =
      "<h2 style='color:red'>Failed to load channels</h2>";
  }
}

// ==================================================
// HELPERS
// ==================================================
function fullscreen(el) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

function getYTid(url) {
  const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

function groupByCategory(list) {
  return list.reduce((g, c) => {
    (g[c.category] ||= []).push(c);
    return g;
  }, {});
}

// ==================================================
// RENDER MAIN UI
// ==================================================
function render() {
  const container = document.getElementById("channelSections");
  container.innerHTML = "";

  const grouped = groupByCategory(channels);

  for (const [cat, items] of Object.entries(grouped)) {
    const h = document.createElement("h2");
    h.textContent = cat;
    container.appendChild(h);

    const row = document.createElement("div");
    row.className = "horizontal-scroll";

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "card-item";
      card.tabIndex = 0;
      card.innerHTML = `
        <img src="${item.logo}">
        <p>${item.name}</p>
      `;
      card.onclick = () =>
        item.type === "series"
          ? openSeries(item)
          : playStream(item.stream);
      row.appendChild(card);
    });

    container.appendChild(row);
  }
}

// ==================================================
// SERIES / EPISODES
// ==================================================
function openSeries(series) {
  const container = document.getElementById("episodeContainer");
  const list = document.getElementById("episodeList");

  list.innerHTML = `<h2>${series.name}</h2>`;

  series.seasons.forEach(season => {
    const sh = document.createElement("h3");
    sh.textContent = `Season ${season.season}`;
    list.appendChild(sh);

    season.episodes.forEach(ep => {
      const div = document.createElement("div");
      div.className = "episode";
      div.tabIndex = 0;
      div.textContent = ep.title;
      div.onclick = () => playStream(ep);
      list.appendChild(div);
    });
  });

  container.style.display = "block";
  fullscreen(container);
}

function closeEpisodes() {
  document.getElementById("episodeContainer").style.display = "none";
}

// ==================================================
// PLAYER
// ==================================================
async function playStream(stream) {
  closeEpisodes();

  const container = document.getElementById("videoContainer");
  const video = document.getElementById("videoPlayer");
  const yt = document.getElementById("ytFrame");

  container.style.display = "block";

  // Reset
  video.pause();
  video.removeAttribute("src");
  video.load();
  yt.src = "";
  yt.style.display = "none";
  video.style.display = "none";

  // ---------------- YOUTUBE ----------------
  if (stream.type === "youtube") {
    const id = getYTid(stream.url);
    if (!id) return alert("Invalid YouTube URL");
    yt.style.display = "block";
    yt.src = `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`;
    fullscreen(container);
    return;
  }

  video.style.display = "block";

  // ---------------- MP4 ----------------
  if (stream.type === "mp4") {
    video.src = stream.url;
    await video.play();
    fullscreen(container);
    return;
  }

  // ---------------- HLS (SHAKA) ----------------
  if (stream.type === "hls") {
    if (!shakaPlayer) {
      shakaPlayer = new shaka.Player(video);
    }

    await shakaPlayer.unload();

    try {
      await shakaPlayer.load(stream.url);
      await video.play();
      fullscreen(container);
    } catch (e) {
      console.error("Shaka error:", e);
      alert("Failed to play stream");
    }
  }
}

// ==================================================
// CLOSE PLAYER
// ==================================================
function closeVideo() {
  const container = document.getElementById("videoContainer");
  const video = document.getElementById("videoPlayer");
  const yt = document.getElementById("ytFrame");

  container.style.display = "none";
  video.pause();
  video.removeAttribute("src");
  yt.src = "";

  if (document.fullscreenElement) document.exitFullscreen();
}

// ==================================================
// INIT
// ==================================================
window.onload = loadChannels;
