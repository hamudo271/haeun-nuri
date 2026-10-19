/* 콘텐츠 관리자 화면 — 유튜브 영상 · 전문칼럼 (두 사이트 공용, 사이트 정보는 /api/cms/config 에서 받는다) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KIND = { youtube: '유튜브', column: '전문칼럼' };
  let CFG = null;
  let dirty = false;

  async function api(path, opt = {}) {
    const headers = { ...(opt.headers || {}) };
    if (opt.method && opt.method !== 'GET') headers['X-CMS'] = '1';
    if (opt.body && typeof opt.body === 'string') headers['content-type'] = 'application/json';
    const r = await fetch('/api/cms/' + path, { credentials: 'same-origin', ...opt, headers });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(d.error || '요청을 처리하지 못했습니다.');
      e.status = r.status;
      throw e;
    }
    return d;
  }
  function toast(msg, bad) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'on' + (bad ? ' bad' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.className = ''), 2600);
  }
  const pubUrl = (kind, id) => (kind === 'column' && id ? CFG.urls.columnView.replace('{id}', id) : CFG.urls[kind]);
  const thumb = (p) =>
    p.kind === 'youtube' ? `https://i.ytimg.com/vi/${p.video_id}/mqdefault.jpg` : p.cover_id ? `/media/${p.cover_id}` : '';
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------------- 로그인 ---------------- */
  function renderLogin() {
    app.className = '';
    app.innerHTML = `
      <div class="login"><form>
        <div class="brand">${esc(CFG.name)}</div>
        <h1>콘텐츠 관리자</h1>
        <p>유튜브 영상과 전문칼럼을 등록·수정하는 화면입니다.${CFG.configured ? '' : '<br><b>아직 관리자 비밀번호가 설정되지 않았습니다.</b>'}</p>
        <label class="field"><span>비밀번호</span><input class="inp" type="password" name="pw" autocomplete="current-password" required autofocus></label>
        <button class="btn pri block" type="submit">로그인</button>
        <p class="err" aria-live="polite"></p>
      </form></div>`;
    $('form', app).addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = $('button', e.target);
      b.disabled = true;
      try {
        await api('login', { method: 'POST', body: JSON.stringify({ password: e.target.pw.value }) });
        route();
      } catch (err) {
        $('.err', app).textContent = err.message;
        b.disabled = false;
      }
    });
  }

  /* ---------------- 틀 ---------------- */
  function shell(kind) {
    app.className = '';
    app.innerHTML = `
      <header class="top">
        <div class="logo"><small>${esc(CFG.name)}</small>콘텐츠 관리자</div>
        <nav class="tabs" aria-label="콘텐츠 종류">
          <button type="button" data-k="youtube" class="${kind === 'youtube' ? 'on' : ''}">유튜브 영상</button>
          <button type="button" data-k="column" class="${kind === 'column' ? 'on' : ''}">전문칼럼</button>
        </nav>
        <div class="sp"></div>
        <a class="btn sm ghost" href="${esc(CFG.home)}" target="_blank" rel="noopener">사이트 보기 ↗</a>
        <button type="button" class="btn sm ghost" data-act="pw">비밀번호 변경</button>
        <button type="button" class="btn sm" data-act="out">로그아웃</button>
      </header>
      <main class="wrap" id="view"></main>`;
    $$('.tabs button', app).forEach((b) => b.addEventListener('click', () => go(`#/${b.dataset.k}`)));
    $('[data-act=out]', app).addEventListener('click', async () => {
      await api('logout', { method: 'POST' }).catch(() => {});
      dirty = false;
      location.hash = '';
      route();
    });
    $('[data-act=pw]', app).addEventListener('click', passwordModal);
    return $('#view', app);
  }
  function go(h) {
    if (dirty && !confirm('저장하지 않은 내용이 있습니다. 이동할까요?')) return;
    dirty = false;
    location.hash = h;
  }

  /* ---------------- 목록 ---------------- */
  const listState = { youtube: { page: 1, q: '', status: '' }, column: { page: 1, q: '', status: '' } };
  async function renderList(kind) {
    const v = shell(kind);
    const st = listState[kind];
    v.innerHTML = `
      <div class="head"><div><h2>${KIND[kind]}</h2><p>${kind === 'youtube' ? '유튜브 주소만 넣으면 제목·썸네일이 자동으로 채워집니다.' : '전문칼럼은 사이트의 ‘전문칼럼’ 메뉴에 공개됩니다.'}</p></div>
        <div style="display:flex;gap:8px"><a class="btn" href="${esc(pubUrl(kind))}" target="_blank" rel="noopener">공개 화면 ↗</a><button type="button" class="btn pri" data-act="new">+ 새 ${KIND[kind]}</button></div></div>
      <div class="tools">
        <input class="inp" type="search" placeholder="제목·카테고리·글쓴이 검색" value="${esc(st.q)}">
        <select class="inp"><option value="">전체 상태</option><option value="published"${st.status === 'published' ? ' selected' : ''}>공개</option><option value="draft"${st.status === 'draft' ? ' selected' : ''}>임시저장</option></select>
      </div>
      <div class="list"><div class="empty">불러오는 중…</div></div>
      <div class="pager"></div>`;
    $('[data-act=new]', v).addEventListener('click', () => go(`#/${kind}/new`));
    const q = $('input[type=search]', v);
    let t;
    q.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        st.q = q.value.trim();
        st.page = 1;
        load();
      }, 300);
    });
    $('select', v).addEventListener('change', (e) => {
      st.status = e.target.value;
      st.page = 1;
      load();
    });
    async function load() {
      const box = $('.list', v);
      try {
        const d = await api(`posts?kind=${kind}&page=${st.page}&q=${encodeURIComponent(st.q)}&status=${st.status}`);
        if (!d.items.length) {
          box.innerHTML = `<div class="empty"><b>${st.q || st.status ? '조건에 맞는 글이 없습니다.' : `아직 등록된 ${KIND[kind]}이 없습니다.`}</b>오른쪽 위 ‘+ 새 ${KIND[kind]}’ 버튼으로 등록하세요.</div>`;
        } else {
          box.innerHTML = d.items
            .map(
              (p) => `
            <div class="item">
              <div class="th${p.kind === 'youtube' ? ' yt' : ''}" style="${thumb(p) ? `background-image:url('${esc(thumb(p))}')` : ''}"></div>
              <div><div class="t">${esc(p.title)}</div>
                <div class="m"><span class="badge ${p.status === 'published' ? 'pub' : 'draft'}">${p.status === 'published' ? '공개' : '임시저장'}</span>${p.pinned ? '<span class="badge pin">상단 고정</span>' : ''}
                <span>${esc(p.published_at || '')}</span>${p.category ? `<span>· ${esc(p.category)}</span>` : ''}${p.author ? `<span>· ${esc(p.author)}</span>` : ''}${p.kind === 'column' ? `<span>· 조회 ${p.views}</span>` : ''}</div></div>
              <div class="acts"><a class="btn sm ghost" href="${esc(pubUrl(p.kind, p.id))}${p.status === 'draft' && p.kind === 'column' ? '?preview=1' : ''}" target="_blank" rel="noopener">보기</a><button type="button" class="btn sm" data-edit="${p.id}">수정</button></div>
            </div>`,
            )
            .join('');
          $$('[data-edit]', box).forEach((b) => b.addEventListener('click', () => go(`#/${kind}/${b.dataset.edit}`)));
        }
        const pg = $('.pager', v);
        pg.innerHTML =
          d.pages > 1 ? Array.from({ length: d.pages }, (_, i) => `<button type="button" class="${i + 1 === d.page ? 'on' : ''}">${i + 1}</button>`).join('') : '';
        $$('button', pg).forEach((b, i) =>
          b.addEventListener('click', () => {
            st.page = i + 1;
            load();
          }),
        );
      } catch (e) {
        if (e.status === 401) return renderLogin();
        box.innerHTML = `<div class="empty"><b>목록을 불러오지 못했습니다.</b>${esc(e.message)}</div>`;
      }
    }
    load();
  }

  /* ---------------- 이미지 줄이기·올리기 ---------------- */
  async function shrink(file, max = 1600) {
    let src;
    try {
      src = await createImageBitmap(file);
    } catch {
      src = await new Promise((ok, no) => {
        const im = new Image();
        im.onload = () => ok(im);
        im.onerror = () => no(new Error('이미지를 읽지 못했습니다. JPG·PNG 파일인지 확인해 주세요.'));
        im.src = URL.createObjectURL(file);
      });
    }
    const W = src.width;
    const H = src.height;
    const s = Math.min(1, max / Math.max(W, H));
    const w = Math.round(W * s);
    const h = Math.round(H * s);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, w, h);
    x.drawImage(src, 0, 0, w, h);
    let q = 0.86;
    let blob;
    do {
      blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      q -= 0.08;
    } while (blob.size > 1_600_000 && q > 0.4);
    return { blob, w, h };
  }
  async function upload(file) {
    const { blob, w, h } = await shrink(file);
    return api(`media?w=${w}&h=${h}`, { method: 'POST', body: blob, headers: { 'content-type': 'image/jpeg' } });
  }
  const pickFile = () =>
    new Promise((ok) => {
      const i = document.createElement('input');
      i.type = 'file';
      i.accept = 'image/*';
      i.onchange = () => ok(i.files[0] || null);
      i.click();
    });

  /* ---------------- 편집 ---------------- */
  async function renderEdit(kind, id) {
    const v = shell(kind);
    let p = { kind, status: 'published', title: '', summary: '', body: '', video_id: '', category: '', author: '', cover_id: null, pinned: 0, published_at: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) };
    if (id) {
      try {
        p = await api(`posts/${id}`);
      } catch (e) {
        if (e.status === 401) return renderLogin();
        v.innerHTML = `<div class="empty"><b>글을 불러오지 못했습니다.</b>${esc(e.message)}</div>`;
        return;
      }
    }
    const cats = await api(`categories?kind=${kind}`).catch(() => []);
    const authors = CFG.authors || [];
    const yt = kind === 'youtube';
    v.innerHTML = `
      <div class="head"><div><a href="#/${kind}" class="btn sm ghost" data-back>← ${KIND[kind]} 목록</a><h2 style="margin-top:10px">${id ? `${KIND[kind]} 수정` : `새 ${KIND[kind]}`}</h2></div></div>
      <form class="edit" novalidate>
        <div class="card">
          ${
            yt
              ? `<label class="field"><span>유튜브 주소 <small>영상 주소나 공유 주소(youtu.be)를 붙여 넣으세요</small></span>
                 <div style="display:flex;gap:8px"><input class="inp" name="url" value="${p.video_id ? `https://www.youtube.com/watch?v=${esc(p.video_id)}` : ''}" placeholder="https://www.youtube.com/watch?v=..." required><button type="button" class="btn" data-act="oembed">불러오기</button></div>
                 <div class="yt-prev"></div></label>`
              : ''
          }
          <label class="field"><span>제목</span><input class="inp" name="title" value="${esc(p.title)}" maxlength="200" required></label>
          <label class="field"><span>${yt ? '영상 설명' : '요약'} <small>${yt ? '목록과 상세 화면에 보입니다' : '목록 카드와 검색 결과에 보입니다. 비우면 본문 앞부분이 들어갑니다'}</small></span><textarea class="inp" name="summary" maxlength="600" rows="3">${esc(p.summary)}</textarea></label>
          ${
            yt
              ? ''
              : `<div class="field"><span>본문</span>
              <div class="rte"><div class="bar">
                <button type="button" data-c="formatBlock" data-v="h2" title="큰 제목">제목</button><button type="button" data-c="formatBlock" data-v="h3" title="작은 제목">소제목</button><button type="button" data-c="formatBlock" data-v="p" title="본문">본문</button><i></i>
                <button type="button" data-c="bold" title="굵게"><b>B</b></button><button type="button" data-c="italic" title="기울임"><i style="width:auto;background:none;margin:0">I</i></button><button type="button" data-c="underline" title="밑줄"><u>U</u></button><i></i>
                <button type="button" data-c="formatBlock" data-v="blockquote" title="인용·강조 상자">인용</button><button type="button" data-c="insertUnorderedList" title="글머리표">• 목록</button><button type="button" data-c="insertOrderedList" title="번호 목록">1. 목록</button><i></i>
                <button type="button" data-x="link" title="링크">링크</button><button type="button" data-x="img" title="사진 넣기">사진</button><button type="button" data-x="yt" title="유튜브 영상 넣기">영상</button><button type="button" data-c="insertHorizontalRule" title="구분선">구분선</button><i></i>
                <button type="button" data-x="clear" title="서식 지우기">서식 지우기</button>
              </div><div class="ed" contenteditable="true" data-ph="여기에 칼럼 본문을 쓰세요. 제목·소제목·사진을 위 도구로 넣을 수 있습니다."></div></div></div>`
          }
        </div>
        <aside class="side">
          <div class="card">
            <h3>게시 설정</h3>
            <div class="seg" style="margin-bottom:16px">
              <label><input type="radio" name="status" value="published"${p.status === 'published' ? ' checked' : ''}><span>공개</span></label>
              <label><input type="radio" name="status" value="draft"${p.status === 'draft' ? ' checked' : ''}><span>임시저장</span></label>
            </div>
            <label class="field"><span>게시일</span><input class="inp" type="date" name="published_at" value="${esc(p.published_at || '')}"></label>
            <label class="field"><span>카테고리 <small>새로 입력하거나 고르세요</small></span><input class="inp" name="category" value="${esc(p.category)}" list="cats" maxlength="40"><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
            ${
              yt
                ? ''
                : `<label class="field"><span>글쓴이</span><input class="inp" name="author" value="${esc(p.author)}" list="authors" maxlength="40"><datalist id="authors">${authors.map((a) => `<option value="${esc(a)}">`).join('')}</datalist></label>`
            }
            <label class="check"><input type="checkbox" name="pinned"${p.pinned ? ' checked' : ''}> 목록 맨 위에 고정</label>
          </div>
          ${
            yt
              ? ''
              : `<div class="card"><h3>대표 이미지</h3><div class="cover${p.cover_id ? ' has' : ''}" style="${p.cover_id ? `background-image:url('/media/${p.cover_id}')` : ''}">클릭해서 이미지 올리기<button type="button" class="btn sm x">빼기</button></div><p class="hint">목록 카드와 글 맨 위에 쓰입니다. 큰 사진은 자동으로 줄여서 올립니다.</p></div>`
          }
          <div class="card" style="display:grid;gap:8px">
            <button type="submit" class="btn pri block">${id ? '저장하기' : '등록하기'}</button>
            ${id ? `<a class="btn block" href="${esc(pubUrl(kind, id))}${!yt && p.status === 'draft' ? '?preview=1' : ''}" target="_blank" rel="noopener">사이트에서 보기 ↗</a>` : ''}
            ${id ? '<button type="button" class="btn danger block" data-act="del">삭제</button>' : ''}
          </div>
        </aside>
      </form>`;
    const f = $('form', v);
    $('[data-back]', v).addEventListener('click', (e) => {
      e.preventDefault();
      go(`#/${kind}`);
    });
    f.addEventListener('input', () => (dirty = true));
    let coverId = p.cover_id;

    // 유튜브 미리보기·정보 불러오기
    if (yt) {
      const prev = $('.yt-prev', v);
      const show = (vid) => {
        prev.classList.toggle('on', !!vid);
        prev.innerHTML = vid ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(vid)}?rel=0" title="미리보기" allowfullscreen></iframe>` : '';
      };
      if (p.video_id) show(p.video_id);
      $('[data-act=oembed]', v).addEventListener('click', async () => {
        try {
          const d = await api(`oembed?url=${encodeURIComponent(f.url.value)}`);
          show(d.id);
          if (d.title && !f.title.value.trim()) f.title.value = d.title;
          toast(d.note || (d.title ? '영상 정보를 불러왔습니다.' : '영상은 확인했습니다. 제목을 입력해 주세요.'), !!d.note);
          dirty = true;
        } catch (e) {
          toast(e.message, true);
        }
      });
    }

    // 칼럼 본문 편집기
    const ed = $('.ed', v);
    if (ed) {
      ed.innerHTML = p.body || '';
      document.execCommand('defaultParagraphSeparator', false, 'p');
      ed.addEventListener('paste', (e) => {
        const t = e.clipboardData.getData('text/plain');
        if (!t) return;
        e.preventDefault();
        const html = t
          .replace(/\r/g, '')
          .split(/\n{2,}/)
          .map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`)
          .join('');
        document.execCommand('insertHTML', false, html);
      });
      $$('.bar [data-c]', v).forEach((b) =>
        b.addEventListener('click', () => {
          ed.focus();
          document.execCommand(b.dataset.c, false, b.dataset.v ? `<${b.dataset.v}>` : null);
          dirty = true;
        }),
      );
      $$('.bar [data-x]', v).forEach((b) =>
        b.addEventListener('click', async () => {
          const x = b.dataset.x;
          const sel = window.getSelection();
          const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
          const restore = () => {
            ed.focus();
            if (range) {
              sel.removeAllRanges();
              sel.addRange(range);
            }
          };
          if (x === 'link') {
            const u = prompt('연결할 주소(https://...)를 입력하세요');
            if (!u) return;
            restore();
            document.execCommand('createLink', false, u);
            $$('a', ed).forEach((a) => /^https?:/i.test(a.getAttribute('href') || '') && a.setAttribute('target', '_blank'));
          } else if (x === 'img') {
            const file = await pickFile();
            if (!file) return;
            toast('사진을 올리는 중…');
            try {
              const d = await upload(file);
              restore();
              document.execCommand('insertHTML', false, `<p><img src="${d.url}" alt=""></p>`);
              toast('사진을 넣었습니다.');
            } catch (e) {
              toast(e.message, true);
            }
          } else if (x === 'yt') {
            const u = prompt('넣을 유튜브 영상 주소를 입력하세요');
            if (!u) return;
            const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/) || u.match(/^([\w-]{11})$/);
            if (!m) return toast('유튜브 주소를 확인해 주세요.', true);
            restore();
            document.execCommand('insertHTML', false, `<div><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="유튜브 영상"></iframe></div><p></p>`);
          } else if (x === 'clear') {
            restore();
            document.execCommand('removeFormat');
            document.execCommand('formatBlock', false, '<p>');
          }
          dirty = true;
        }),
      );
    }

    // 대표 이미지
    const cover = $('.cover', v);
    if (cover) {
      cover.addEventListener('click', async (e) => {
        if (e.target.closest('.x')) {
          coverId = null;
          cover.classList.remove('has');
          cover.style.backgroundImage = '';
          dirty = true;
          return;
        }
        const file = await pickFile();
        if (!file) return;
        toast('이미지를 올리는 중…');
        try {
          const d = await upload(file);
          coverId = d.id;
          cover.classList.add('has');
          cover.style.backgroundImage = `url('${d.url}')`;
          dirty = true;
          toast('대표 이미지를 올렸습니다.');
        } catch (err) {
          toast(err.message, true);
        }
      });
    }

    // 저장·삭제
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('[type=submit]', f);
      const body = {
        kind,
        title: f.title.value,
        summary: f.summary.value,
        status: f.status.value,
        published_at: f.published_at.value,
        category: f.category.value,
        author: f.author ? f.author.value : '',
        pinned: f.pinned.checked,
        cover_id: coverId,
        url: f.url ? f.url.value : '',
        body: ed ? ed.innerHTML : '',
      };
      btn.disabled = true;
      try {
        const d = await api(id ? `posts/${id}` : 'posts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
        dirty = false;
        toast(body.status === 'published' ? '저장했습니다. 사이트에 공개되었습니다.' : '임시저장했습니다(사이트에는 보이지 않음).');
        if (!id) location.hash = `#/${kind}/${d.id}`;
        else renderEdit(kind, id);
      } catch (err) {
        if (err.status === 401) return renderLogin();
        toast(err.message, true);
        btn.disabled = false;
      }
    });
    const del = $('[data-act=del]', v);
    if (del)
      del.addEventListener('click', async () => {
        if (!confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')) return;
        try {
          await api(`posts/${id}`, { method: 'DELETE' });
          dirty = false;
          toast('삭제했습니다.');
          location.hash = `#/${kind}`;
        } catch (e) {
          toast(e.message, true);
        }
      });
  }

  /* ---------------- 비밀번호 변경 ---------------- */
  function passwordModal() {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<form><h3>관리자 비밀번호 변경</h3>
      <label class="field"><span>현재 비밀번호</span><input class="inp" type="password" name="cur" autocomplete="current-password" required></label>
      <label class="field"><span>새 비밀번호 <small>10자 이상</small></span><input class="inp" type="password" name="nx" autocomplete="new-password" minlength="10" required></label>
      <label class="field"><span>새 비밀번호 확인</span><input class="inp" type="password" name="nx2" autocomplete="new-password" required></label>
      <div class="btns"><button type="button" class="btn" data-x>취소</button><button type="submit" class="btn pri">변경</button></div></form>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    $('[data-x]', m).addEventListener('click', close);
    m.addEventListener('click', (e) => e.target === m && close());
    $('form', m).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.nx.value !== f.nx2.value) return toast('새 비밀번호가 서로 다릅니다.', true);
      try {
        await api('password', { method: 'POST', body: JSON.stringify({ current: f.cur.value, next: f.nx.value }) });
        toast('비밀번호를 바꿨습니다.');
        close();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  /* ---------------- 주소에 따라 화면 고르기 ---------------- */
  async function route() {
    if (!CFG) CFG = await (await fetch('/api/cms/config')).json();
    document.documentElement.style.setProperty('--c', CFG.color?.main || '#8a6a45');
    document.documentElement.style.setProperty('--c2', CFG.color?.dark || '#2b2019');
    document.title = `콘텐츠 관리자 | ${CFG.name}`;
    try {
      await api('me');
    } catch {
      return renderLogin();
    }
    const [, kind = 'youtube', id] = (location.hash || '#/youtube').split('/');
    const k = kind === 'column' ? 'column' : 'youtube';
    if (!id) return renderList(k);
    return renderEdit(k, id === 'new' ? null : id);
  }
  window.addEventListener('hashchange', route);
  route();
})();
