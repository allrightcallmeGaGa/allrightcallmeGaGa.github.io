const changeTime = (time, more = false) => {
  const currentDate = new Date()

  const formatTimestamp = (date) => {
    const d = new Date(date)
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` + `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const calculateDiff = (date1, date2, unit) => {
    const units = { day: 24 * 60 * 60 * 1000, hour: 60 * 60 * 1000 }
    return Math.floor(Math.abs(date1 - date2) / units[unit])
  }

  const describeTime = (datetime) => {
    const timeObj = new Date(datetime)
    const diffDays = calculateDiff(timeObj, currentDate, 'day')
    const diffHours = calculateDiff(timeObj, currentDate, 'hour')

    if (diffHours < 1) return `最近`
    if (diffHours <= 24) return `${diffHours}小时前`
    if (diffDays === 1) return `昨天`
    if (diffDays === 2) return `前天`
    if (diffDays <= 7) return `${diffDays}天前`

    const year = timeObj.getFullYear()
    const month = timeObj.getMonth() + 1
    const date = timeObj.getDate()
    return year !== currentDate.getFullYear() ? `${year}/${month}/${date}` : `${month}/${date}`
  }

  if (more) return formatTimestamp(time)
  if (time) return describeTime(time)

  document.querySelectorAll('time.datatime').forEach((e) => { e.textContent = describeTime(e.getAttribute('datetime')) })
}

let commentData
let commentInterval = null

const comment = {
  fetchData: async (option) => {
    const res = await fetch('https://twikoo.tang-kaikang.top', {
      method: "POST",
      body: JSON.stringify({
        "event": "GET_RECENT_COMMENTS",
        "accessToken": "e9242d91fd9a80d37964f5200da0f779",
        "includeReply": true,
        "pageSize": -1,
        ...option
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json())
    
    return res.data
  },
  new: async (type, exclude) => {
    const comments = document.getElementById('comments-page')
    if (!comments) return

    const commentclick = () => {
      document.querySelectorAll('#comment-tool a').forEach(e =>
        e.addEventListener('click', comment.operate)
      )
    }
    const [a, b, c] = [`<a href="javascript:void(0)" data-type="post" title="显示此文章所有评论">查看更多</a>`, `<a href="javascript:void(0)" data-type="visitor" title="显示该评论者的所有评论">查看Ta更多评论</a>`, `<a href="javascript:void(0)" data-type="all" title="查看本站最新评论">返回评论</a>`]

    let data, tool, html = ''
    if (!commentData) commentData = await comment.fetchData()
    data = commentData
    if (type) data = data.filter(item => item[type] === exclude), tool = type === 'mailMd5' ? a + c : b + c
    else data = data.slice(0, 50), tool = a + b
    if (!ArticleData) await toRandomPost(true)

    data.forEach(item => {
      const time = changeTime(item.created, true)
      const title = Object.values(ArticleData).flatMap(data => data).find(article => article.link === item.url)?.title || '未知标题'

      html += `<div class="comment-card"><div class="comment-info"><img src="${item.avatar}"><div class="comment-information"><span class="comment-user ${item.mailMd5 === '91afb88f9ce8126f2825f7ef9fd64ceb' ? 'comment-author' : ''}" data-mailmd5="${item.mailMd5}">${item.nick}</span><span class="comment-time">${time}</span></div></div><div class="comment-content">${item.commentText.trim()}</div><div class="comment-more"><div class="comment-title"><span class="comment-link" title="查看此文章" onclick="pjax.loadUrl('${item.url}')"><i class="iconfont icat-read"></i>${title}</span><a href="javascript:void(0)" onclick="pjax.loadUrl('${item.url}#${item.id}')">查看评论</a></div><div id="comment-tool">${tool}</div></div></div>`
    })
    comments.innerHTML = html
    commentclick()
  },
  operate: (event) => {
    const type = event.target.getAttribute('data-type')
    const commentCard = event.target.closest('.comment-card')
    if (type === 'visitor') comment.new('mailMd5', commentCard.querySelector('.comment-user').getAttribute('data-mailmd5'))
    if (type === 'post') comment.new('url', commentCard.querySelector('.comment-link').getAttribute('onclick').split("'")[1])
    if (type === 'all') comment.new()
  },
  barrage: async () => {
    const tlol = btf.saveToLocal.get('comment-pop')
    const barrage = document.getElementById('comment-barrage')
    if (tlol === 'off' || !barrage) return

    const ScrollBarrage = () => {
      const scrollResidue = (window.scrollY + document.documentElement.clientHeight) >= (document.getElementById("post-comment") || document.getElementById("footer")).offsetTop
      barrage.classList.toggle('show', !scrollResidue)
    }
    const BarrageBox = (data) => {
      const time = changeTime(new Date(data.created).toISOString(), true)

      let barrages = document.createElement('div')
      barrages.className = 'comment-barrage-item'
      barrages.innerHTML = `<div class="barrageHead"><img class="barrageAvatar" src="${data.avatar}" /><div class="barrageNick">${data.nick}</div><div class="barrageTime">${time}曾评论</div><a class="barrageClose" href="javascript:comment.closeBarrage(true)"><i class="MeuiCat icon-close-fill"></i></a></div><a class="barrageContent" href="javascript:void(0)" onclick="btf.scrollToDest(btf.getEleTop(document.getElementById('${data.id}')), 300)"><p>${data.commentText.trim()}</p></a>`
      box.push(barrages)
      barrage.append(barrages)
    }
    const removeBarrage = (e) => {
      if (!e) return
      e.className = 'comment-barrage-item out'
      setTimeout(() => barrage.removeChild(e), 1000)
    }

    btf.addEventListenerPjax(window, 'scroll', ScrollBarrage, { passive: true })

    let hoverBarrage = false, index = 0, box = []
    const url = `"url": window.location.pathname`
    const data = await comment.fetchData(url)
    if (!data.length) return

    barrage.addEventListener('mouseenter', () => hoverBarrage = true)
    barrage.addEventListener('mouseleave', () => hoverBarrage = false)

    clearInterval(commentInterval)
    commentInterval = setInterval(() => {
      if (box.length >= 1 && !hoverBarrage) removeBarrage(box.shift())
      if (!hoverBarrage) {
        BarrageBox(data[index])
        index = (index + 1) % data.length
      }
    }, 5000)
  },
  closeBarrage: (state = false) => {
    const removeBarrage = () => {
      const $comment = document.querySelector('#comment-barrage')
      $comment.className = 'out'
      setTimeout(() => { $comment.innerHTML = '', $comment.className = 'show' }, 1000)
    }

    if (state) return clearInterval(commentInterval), removeBarrage()

    const comments = btf.saveToLocal.get('comment-pop')
    btf.saveToLocal.set('comment-pop', comments === 'off' ? 'on' : 'off', 2)
    comments === 'off' ? comment.barrage() : (clearInterval(commentInterval), removeBarrage())
  }
}
btf.addGlobalFn('pjaxComplete', comment.new(), 'comment')
btf.addGlobalFn('pjaxComplete', comment.barrage(), 'barrage')

let ArticleData

const toRandomPost = async () => {
  if (!ArticleData) ArticleData = await fetch('/articles.json').then(res => res.json())
}
