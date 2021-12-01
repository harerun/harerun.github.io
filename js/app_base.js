const i18n_map = {
    'zh_cn': zh_cn_translate,
    'jp': jp_translate
}

let app_url = {};
let app_i18n = null;

const navbar_ids = ['nav-stream', 'nav-calender', 'nav-single', 'nav-song-list', 'nav-utils'];

function app_load_conf(key, def_value) {
    const local_value = window.localStorage.getItem(key);
    return local_value === null ? def_value : local_value;
}

function app_set_conf(key, value) {
    window.localStorage.setItem(key, value);
}

function app_parse_url() {
    function split_first(raw, key) {
        const pos = raw.indexOf(key);
        if(pos===-1) {
            return [raw, ''];
        }
        return [raw.substring(0, pos), raw.substring(pos+1)]
    }

    //Extract the parameter from the URL.
    const root_exp = new RegExp('.*(?=\/)'), page_url=window.location.href;
    const root = root_exp.exec(page_url).toString() + '/';
    let page_params = split_first(page_url.substring(root.length), '#');
    page_params = page_params[1];
    //Parse and construct the keys.
    let keys = {};
    for(let i of page_params.split('&')) {
        const param_info = split_first(i, '=');
        keys[param_info[0]] = param_info[1];
    }
    app_url.args = keys;
}

function apply_language(language_key) {
    // Set the i18n.
    app_i18n = i18n_map[language_key];
    // Update nav-bar name.
    document.getElementById('nav-language').innerHTML = app_i18n.translate_name;
    // Create the language menu content.
    const language_keys = Object.keys(i18n_map);
    let language_items = [];
    for(let i=0; i<language_keys.length; ++i) {
        if(language_keys[i] === language_key) {
            continue;
        }
        // Render the item.
        language_items.push('<li><a class="dropdown-item" href="#" id="nav-language-'+language_keys[i]+'">'+i18n_map[language_keys[i]].translate_name+'</a></li>')
    }
    document.getElementById('nav-language-menu').innerHTML = language_items.join('\n');
    // Set the function.
    for(let i=0; i<language_keys.length; ++i) {
        if(language_keys[i] === language_key) {
            continue;
        }
        // Render the item.
        document.getElementById('nav-language-'+language_keys[i]).onclick = function() {
            app_set_conf('language', language_keys[i]);
            //Refersh the current page.
            window.location.reload();
        }
    }
}

function app_fetch(url, finished) {
    //Load the single page to content.
    let loader = new XMLHttpRequest();
    loader.open('GET', url);
    loader.onload = function() { finished(loader.responseText); };
    loader.send();
}

function app_load_panel(panel_url, callback) {
    //Fetch the panel URL.
    app_fetch(panel_url, function(page_data) {
        document.getElementById('app-panel').innerHTML = page_data;
        //Call the post-render callback.
        if(callback !== null) {
            callback();
        }
    });
}

function app_load_json(target, url, callback, post_process_callback) {
    if(target.records.length > 0) {
        // Check the callback function.
        if(callback !== null) {
            callback();
        }
    } else {
        //Fetch the json data.
        app_fetch(url, function (json_raw_data) {
            //Parse the json data.
            let raw_json = JSON.parse(json_raw_data);
            //Run the post-processing if exist.
            if(post_process_callback !== null) {
                raw_json = post_process_callback(raw_json);
            }
            //Assign the data.
            target.records = raw_json;
            // Check the callback function.
            if(callback !== null) {
                callback();
            }
        });
    }
}

function app_open_url(url) {
    window.open(url, '_blank');
}

function app_hyperlink(url) {
    return '<a href="' + url + '" target="_blank" rel="noreferrer noopener">';
}

function app_archive_url(y_url, b_url, expected) {
    //Check empty.
    if(y_url.length === 0) {
        return b_url;
    }
    if(b_url.length === 0) {
        return y_url;
    }
    //Both are available.
    if(app_i18n.force_bilibili || expected === 'b') {
        //When forcely or expect to use bilibili, then use b url.
        return b_url;
    }
    //Otherwise, youtube url.
    return y_url;
}

function render_header() {
    document.getElementById('nav-brand').innerHTML = app_i18n.brand;
    // Render the header items.
    const navbar_names = app_i18n.navbar;
    for(let i=0; i<navbar_names.length; ++i) {
        // Update the button label.
        document.getElementById(navbar_ids[i]).innerHTML = navbar_names[i];
    }
}

function time_str_minsec(min_or_sec) {
    if (min_or_sec < 10) {
        return '0' + min_or_sec.toString();
    }
    return min_or_sec.toString();
}

function render_contact_links() {
    const button_names = app_i18n.contacts,
        button_ids = ['harerun-twitter', 'harerun-youtube', 'harerun-bilibili', 'harerun-fanbox'],
        button_urls = [
            'https://twitter.com/hanamaruhareru',
            'https://www.youtube.com/channel/UCyIcOCH-VWaRKH9IkR8hz7Q',
            'https://space.bilibili.com/441381282',
            'https://hanamaruhareru.fanbox.cc/'
        ];
    for(let i=0; i<button_ids.length; ++i) {
        // Update the button label.
        document.getElementById(button_ids[i]).innerHTML = button_names[i];
        // Update the onclick label.
        document.getElementById(button_ids[i]).onclick = function () { app_open_url(button_urls[i]); }
    }
}

function header_set_item(item_id) {
    // Clear all the items.
    for(let i=0; i<navbar_ids.length; ++i) {
        document.getElementById('item-'+navbar_ids[i]).classList.remove('active');
    }
    // Set the current item.
    document.getElementById('item-'+item_id).classList.add('active');
}