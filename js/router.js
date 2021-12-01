const router_map = {
    '/': load_streams,
    'calender': load_calender,
    'single': load_single,
    'setori': sl_load_setori,
    'song-info': sl_load_song_info,
    'song-list': sl_load_song_list,
    'medley-list': sl_load_medley_list,
}

function router_handle_url() {
    // Parse the url.
    app_parse_url();
    // Based on url, parse the function.
    const route_keys = Object.keys(router_map);
    for(let i=0; i<route_keys.length; ++i) {
        // If we found the key, use the function.
        if(route_keys[i] in app_url.args) {
            router_map[route_keys[i]]();
            return;
        }
    }
    //Or else, call the default function.
    router_map['/']();
}

function app_init() {
    // Update the language settings.
    apply_language(app_load_conf('language', 'zh_cn'));
    // Render the title and banner.
    render_header();
    render_contact_links();
    // This is the entrance of the app.
    router_handle_url();
    // When the url is change, we update the content.
    window.addEventListener('hashchange', router_handle_url, false);
}
