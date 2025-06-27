(function () {
    // Bald Eagle - Enhanced Rammerhead Proxy
    const mod = (n, m) => ((n % m) + m) % m;
    const baseDictionary = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~-';
    const shuffledIndicator = '_rhs';
    
    // 日本語メッセージ
    const messages = {
        error: 'エラーが発生しました: ',
        serverError: 'サーバーとの通信に失敗しました',
        unexpectedResponse: 'サーバーから予期しない応答がありました: ',
        sessionNotFound: 'セッションが見つかりません。新しいセッションを作成するか、削除してください',
        sessionRequired: 'セッションIDを先に生成してください',
        bookmarkAdded: 'ブックマークに追加しました',
        bookmarkRemoved: 'ブックマークから削除しました',
        confirmDelete: 'このセッションを削除してもよろしいですか？',
        fillSession: '既存セッションを使用',
        deleteSession: '削除',
        lastAccess: '最終アクセス',
        never: 'なし'
    };

    // テーマ管理（軽量化）
    const themeManager = {
        init() {
            const savedTheme = localStorage.getItem('bald-eagle-theme') || 'light';
            this.setTheme(savedTheme);
            
            document.getElementById('theme-toggle').addEventListener('click', () => {
                const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        },
        
        setTheme(theme) {
            document.body.className = theme + '-mode';
            localStorage.setItem('bald-eagle-theme', theme);
            
            const toggle = document.getElementById('theme-toggle');
            toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggle.title = theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
        }
    };

    // ブックマーク管理（軽量化）
    const bookmarkManager = {
        key: 'bald-eagle-bookmarks',
        
        get() {
            try {
                return JSON.parse(localStorage.getItem(this.key)) || [];
            } catch {
                return [];
            }
        },
        
        save(bookmarks) {
            localStorage.setItem(this.key, JSON.stringify(bookmarks));
        },
        
        add(url, title = '') {
            const bookmarks = this.get();
            const newBookmark = {
                url,
                title: title || new URL(url).hostname,
                addedAt: Date.now()
            };
            
            if (!bookmarks.find(b => b.url === url)) {
                bookmarks.unshift(newBookmark);
                if (bookmarks.length > 10) bookmarks.pop(); // 最大10個まで
                this.save(bookmarks);
                this.render();
                this.showNotification('ブックマークに追加しました');
            }
        },
        
        remove(url) {
            const bookmarks = this.get().filter(b => b.url !== url);
            this.save(bookmarks);
            this.render();
            this.showNotification('ブックマークから削除しました');
        },
        
        render() {
            const container = document.getElementById('bookmarks-container');
            const bookmarks = this.get();
            
            if (bookmarks.length === 0) {
                container.innerHTML = '<p class="text-muted">まだブックマークがありません</p>';
                return;
            }
            
            container.innerHTML = bookmarks.map(bookmark => `
                <div class="d-flex justify-content-between align-items-center mb-2" 
                     style="padding: 0.5rem; background: var(--surface-color); border-radius: var(--radius);">
                    <div style="cursor: pointer;" onclick="bookmarkManager.useBookmark('${bookmark.url}')">
                        <strong>${bookmark.title}</strong>
                        <small class="text-muted d-block">${bookmark.url}</small>
                    </div>
                    <button class="btn btn-outline-danger btn-sm" onclick="bookmarkManager.remove('${bookmark.url}')">
                        ×
                    </button>
                </div>
            `).join('');
        },
        
        useBookmark(url) {
            document.getElementById('session-url').value = url;
            document.getElementById('session-url').focus();
        },
        
        showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 80px; z-index: 1050;
                background: var(--primary-color); color: white; padding: 0.75rem 1rem;
                border-radius: var(--radius); box-shadow: var(--shadow);
                font-size: 0.875rem; opacity: 0; transition: opacity 0.3s ease;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            setTimeout(() => notification.style.opacity = '1', 10);
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        }
    };

    // 統計情報（軽量化）
    const statsManager = {
        updateStats() {
            const sessions = sessionIdsStore.get();
            document.getElementById('active-sessions').textContent = sessions.length;
            
            const today = new Date().toDateString();
            const count = parseInt(localStorage.getItem('daily-connections-' + today)) || 0;
            document.getElementById('daily-connections').textContent = count;
        },
        
        incrementDailyConnections() {
            const today = new Date().toDateString();
            let count = parseInt(localStorage.getItem('daily-connections-' + today)) || 0;
            localStorage.setItem('daily-connections-' + today, ++count);
            this.updateStats();
        }
    };

    const generateDictionary = function () {
        let str = '';
        const split = baseDictionary.split('');
        while (split.length > 0) {
            str += split.splice(Math.floor(Math.random() * split.length), 1)[0];
        }
        return str;
    };

    class StrShuffler {
        constructor(dictionary = generateDictionary()) {
            this.dictionary = dictionary;
        }
        shuffle(str) {
            if (str.startsWith(shuffledIndicator)) {
                return str;
            }
            let shuffledStr = '';
            for (let i = 0; i < str.length; i++) {
                const char = str.charAt(i);
                const idx = baseDictionary.indexOf(char);
                if (char === '%' && str.length - i >= 3) {
                    shuffledStr += char;
                    shuffledStr += str.charAt(++i);
                    shuffledStr += str.charAt(++i);
                } else if (idx === -1) {
                    shuffledStr += char;
                } else {
                    shuffledStr += this.dictionary.charAt(mod(idx + i, baseDictionary.length));
                }
            }
            return shuffledIndicator + shuffledStr;
        }
        unshuffle(str) {
            if (!str.startsWith(shuffledIndicator)) {
                return str;
            }

            str = str.slice(shuffledIndicator.length);

            let unshuffledStr = '';
            for (let i = 0; i < str.length; i++) {
                const char = str.charAt(i);
                const idx = this.dictionary.indexOf(char);
                if (char === '%' && str.length - i >= 3) {
                    unshuffledStr += char;
                    unshuffledStr += str.charAt(++i);
                    unshuffledStr += str.charAt(++i);
                } else if (idx === -1) {
                    unshuffledStr += char;
                } else {
                    unshuffledStr += baseDictionary.charAt(mod(idx - i, baseDictionary.length));
                }
            }
            return unshuffledStr;
        }
    }

    function setError(err) {
        var element = document.getElementById('error-text');
        if (err) {
            element.style.display = 'block';
            element.textContent = messages.error + err;
        } else {
            element.style.display = 'none';
            element.textContent = '';
        }
    }

    function getPassword() {
        var element = document.getElementById('session-password');
        return element ? element.value : '';
    }

    function get(url, callback, shush = false) {
        var pwd = getPassword();
        if (pwd) {
            if (url.includes('?')) {
                url += '&pwd=' + pwd;
            } else {
                url += '?pwd=' + pwd;
            }
        }

        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.send();

        request.onerror = function () {
            if (!shush) setError(messages.serverError);
        };
        request.onload = function () {
            if (request.status === 200) {
                callback(request.responseText);
            } else {
                if (!shush)
                    setError(messages.unexpectedResponse + request.responseText);
            }
        };
    }

    var api = {
        needpassword(callback) {
            get('/needpassword', value => callback(value === 'true'));
        },
        newsession(callback) {
            get('/newsession', callback);
        },
        editsession(id, httpProxy, enableShuffling, callback) {
            get(
                '/editsession?id=' +
                encodeURIComponent(id) +
                (httpProxy ? '&httpProxy=' + encodeURIComponent(httpProxy) : '') +
                '&enableShuffling=' + (enableShuffling ? '1' : '0'),
                function (res) {
                    if (res !== 'Success') return setError(messages.unexpectedResponse + res);
                    callback();
                }
            );
        },
        sessionexists(id, callback) {
            get('/sessionexists?id=' + encodeURIComponent(id), function (res) {
                if (res === 'exists') return callback(true);
                if (res === 'not found') return callback(false);
                setError(messages.unexpectedResponse + res);
            });
        },
        deletesession(id, callback) {
            api.sessionexists(id, function (exists) {
                if (exists) {
                    get('/deletesession?id=' + id, function (res) {
                        if (res !== 'Success' && res !== 'not found')
                            return setError(messages.unexpectedResponse + res);
                        callback();
                    });
                } else {
                    callback();
                }
            });
        },
        shuffleDict(id, callback) {
            get('/api/shuffleDict?id=' + encodeURIComponent(id), function (res) {
                callback(JSON.parse(res));
            });
        }
    };

    var localStorageKey = 'bald-eagle-sessionids';
    var localStorageKeyDefault = 'bald-eagle-default-sessionid';
    var sessionIdsStore = {
        get() {
            var rawData = localStorage.getItem(localStorageKey);
            if (!rawData) return [];
            try {
                var data = JSON.parse(rawData);
                if (!Array.isArray(data)) throw 'getout';
                return data;
            } catch (e) {
                return [];
            }
        },
        set(data) {
            if (!data || !Array.isArray(data)) throw new TypeError('must be array');
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        },
        getDefault() {
            var sessionId = localStorage.getItem(localStorageKeyDefault);
            if (sessionId) {
                var data = sessionIdsStore.get();
                data = data.filter(function (e) {
                    return e.id === sessionId;
                });
                if (data.length) return data[0];
            }
            return null;
        },
        setDefault(id) {
            localStorage.setItem(localStorageKeyDefault, id);
        }
    };

    function renderSessionTable(data) {
        var tbody = document.querySelector('tbody');
        while (tbody.firstChild && !tbody.firstChild.remove());
        
        for (var i = 0; i < data.length; i++) {
            var tr = document.createElement('tr');
            appendIntoTr(data[i].id);
            appendIntoTr(data[i].createdOn);
            appendIntoTr(data[i].lastAccess || messages.never);

            var actionsDiv = document.createElement('div');
            actionsDiv.className = 'd-flex gap-2';

            var fillInBtn = document.createElement('button');
            fillInBtn.textContent = messages.fillSession;
            fillInBtn.className = 'btn btn-outline-primary btn-sm';
            fillInBtn.onclick = index(i, function (idx) {
                setError();
                sessionIdsStore.setDefault(data[idx].id);
                loadSettings(data[idx]);
                // 最終アクセス時間を更新
                data[idx].lastAccess = new Date().toLocaleString();
                sessionIdsStore.set(data);
                renderSessionTable(data);
            });
            actionsDiv.appendChild(fillInBtn);

            var deleteBtn = document.createElement('button');
            deleteBtn.textContent = messages.deleteSession;
            deleteBtn.className = 'btn btn-outline-danger btn-sm';
            deleteBtn.onclick = index(i, function (idx) {
                if (confirm(messages.confirmDelete)) {
                    setError();
                    api.deletesession(data[idx].id, function () {
                        data.splice(idx, 1)[0];
                        sessionIdsStore.set(data);
                        renderSessionTable(data);
                        statsManager.updateStats();
                    });
                }
            });
            actionsDiv.appendChild(deleteBtn);
            
            appendIntoTr(actionsDiv);
            tbody.appendChild(tr);
        }
        
        function appendIntoTr(stuff) {
            var td = document.createElement('td');
            if (typeof stuff === 'object') {
                td.appendChild(stuff);
            } else {
                td.textContent = stuff;
            }
            tr.appendChild(td);
        }
        function index(i, func) {
            return func.bind(null, i);
        }
    }

    function loadSettings(session) {
        document.getElementById('session-id').value = session.id;
        document.getElementById('session-httpproxy').value = session.httpproxy || '';
        document.getElementById('session-shuffling').checked = typeof session.enableShuffling === 'boolean' ? session.enableShuffling : true;
    }

    function loadSessions() {
        var sessions = sessionIdsStore.get();
        var defaultSession = sessionIdsStore.getDefault();
        if (defaultSession) loadSettings(defaultSession);
        renderSessionTable(sessions);
        statsManager.updateStats();
    }

    function addSession(id) {
        var data = sessionIdsStore.get();
        data.unshift({ 
            id: id, 
            createdOn: new Date().toLocaleString(),
            lastAccess: new Date().toLocaleString()
        });
        sessionIdsStore.set(data);
        renderSessionTable(data);
        statsManager.updateStats();
    }

    function editSession(id, httpproxy, enableShuffling) {
        var data = sessionIdsStore.get();
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === id) {
                data[i].httpproxy = httpproxy;
                data[i].enableShuffling = enableShuffling;
                data[i].lastAccess = new Date().toLocaleString();
                sessionIdsStore.set(data);
                return;
            }
        }
        throw new TypeError('cannot find ' + id);
    }

    function showLoadingState(show) {
        const goText = document.getElementById('go-text');
        const goLoading = document.getElementById('go-loading');
        const goButton = document.getElementById('session-go');
        
        if (show) {
            goText.style.display = 'none';
            goLoading.style.display = 'inline-block';
            goButton.disabled = true;
        } else {
            goText.style.display = 'inline';
            goLoading.style.display = 'none';
            goButton.disabled = false;
        }
    }

    // メインポート確認（Codespaces対応）
    get('/mainport', function (data) {
        // Codespacesの場合はポート変更を行わない
        if (window.location.hostname.includes('.app.github.dev')) {
            console.log('🦅 Codespaces環境を検出しました');
            return;
        }
        
        var defaultPort = window.location.protocol === 'https:' ? 443 : 80;
        var currentPort = window.location.port || defaultPort;
        var mainPort = data || defaultPort;
        if (currentPort != mainPort) window.location.port = mainPort;
    });

    // パスワード確認
    api.needpassword(doNeed => {
        if (doNeed) {
            document.getElementById('password-wrapper').style.display = '';
        }
    });

    // ページ読み込み完了時の初期化
    window.addEventListener('load', function () {
        // 各マネージャーの初期化
        themeManager.init();
        bookmarkManager.render();
        loadSessions();

        var showingAdvancedOptions = false;
        document.getElementById('session-advanced-toggle').onclick = function () {
            document.getElementById('session-advanced-container').style.display = (showingAdvancedOptions =
                !showingAdvancedOptions)
                ? 'block'
                : 'none';
        };

        document.getElementById('session-create-btn').onclick = function () {
            setError();
            showLoadingState(true);
            api.newsession(function (id) {
                addSession(id);
                document.getElementById('session-id').value = id;
                document.getElementById('session-httpproxy').value = '';
                showLoadingState(false);
            });
        };

        // ブックマーク追加ボタン
        document.getElementById('add-bookmark').onclick = function () {
            const url = document.getElementById('session-url').value;
            if (url) {
                bookmarkManager.add(url);
            }
        };

        // URL入力時のブックマークボタン表示制御
        document.getElementById('session-url').addEventListener('input', function () {
            const addBookmarkBtn = document.getElementById('add-bookmark');
            const url = this.value.trim();
            if (url && url.startsWith('http')) {
                addBookmarkBtn.style.display = 'inline-block';
            } else {
                addBookmarkBtn.style.display = 'none';
            }
        });

        function go() {
            setError();
            showLoadingState(true);
            
            var id = document.getElementById('session-id').value;
            var httpproxy = document.getElementById('session-httpproxy').value;
            var enableShuffling = document.getElementById('session-shuffling').checked;
            var url = document.getElementById('session-url').value || 'https://www.google.com/';
            
            if (!id) {
                showLoadingState(false);
                return setError(messages.sessionRequired);
            }
            
            api.sessionexists(id, function (value) {
                if (!value) {
                    showLoadingState(false);
                    return setError(messages.sessionNotFound);
                }
                
                api.editsession(id, httpproxy, enableShuffling, function () {
                    editSession(id, httpproxy, enableShuffling);
                    statsManager.incrementDailyConnections();
                    
                    api.shuffleDict(id, function (shuffleDict) {
                        showLoadingState(false);
                        if (!shuffleDict) {
                            window.location.href = '/' + id + '/' + url;
                        } else {
                            var shuffler = new StrShuffler(shuffleDict);
                            window.location.href = '/' + id + '/' + shuffler.shuffle(url);
                        }
                    });
                });
            });
        }

        document.getElementById('session-go').onclick = go;
        document.getElementById('session-url').onkeydown = function (event) {
            if (event.key === 'Enter') go();
        };

        // キーボードショートカット
        document.addEventListener('keydown', function (event) {
            if (event.ctrlKey && event.key === 'Enter') {
                go();
            }
            if (event.ctrlKey && event.key === 'n') {
                event.preventDefault();
                document.getElementById('session-create-btn').click();
            }
        });
    });
})();
