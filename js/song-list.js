let song_list = {
    records: [],
    display_cache: [],
    sort_column: '',
    reverse: false,
    current_song_mode: 0, // 0 = single, 1 = medley, 2 = total
    target_records: null,
};

const sl_table_header_ids = ['sl-song-name', 'sl-song-last', 'sl-song-times', 'sl-song-at-youtube', 'sl-song-at-bilibili']

const sl_song_sort_function = {
    0: function (a, b) {
        const low_a = a[0].toLowerCase(), low_b = b[0].toLowerCase();
        return low_a === low_b ? 0 : (low_a < low_b ? -1 : 1);
    },
    1: function (a, b) {
        const a_date = song_list.records[a[1].last_live[0]].date, b_date = song_list.records[b[1].last_live[0]].date;
        return (a_date === b_date) ? 0 : (a_date < b_date ? -1 : 1);
    },
    2: function (a, b) {
        return a[1]['count'] - b[1]['count'];
    },
    3: function (a, b) {
        return a[1]['y_count'].length - b[1]['y_count'].length;
    },
    4: function (a, b) {
        return a[1]['b_count'].length - b[1]['b_count'].length;
    },
};

function song_name_to_esc(song_name) {
    return encodeURIComponent(song_name);
}

function esc_to_song_name(song_name) {
    return decodeURIComponent(song_name);
}

function sl_pos_to_timestamp(timepos) {
    if (isNaN(timepos)) {
        return '';
    }
    if(timepos < 60) {
        return '00:'+time_str_minsec(timepos);
    }
    let time_min = Math.floor(timepos / 60);
    timepos -= time_min * 60;
    if(time_min < 60) {
        return time_str_minsec(time_min) + ':' + time_str_minsec(timepos);
    }
    let time_hour = Math.floor(time_min / 60);
    time_min -= time_hour * 60;
    return time_hour.toString() + ':' + time_str_minsec(time_min) + ':' + time_str_minsec(timepos);
}

function sl_timestamp_to_pos(timestamp) {
    if(timestamp.startsWith('http')) {
        return NaN;
    }
    //Check how many colon it has.
    timestamp = timestamp.split(':');
    if(timestamp.length === 2) {
        //Min:Sec
        return parseInt(timestamp[0]) * 60 + parseInt(timestamp[1]);
    }
    //Hour:Min:Sec
    return parseInt(timestamp[0]) * 3600 + parseInt(timestamp[1]) * 60 + parseInt(timestamp[2]);
}

function sl_append_time_stamp(live_url, timestamp) {
    //Print the timestamp.
    if(timestamp.startsWith('http')) {
        return timestamp;
    }
    //Check whether url contain question mark.
    if(live_url.indexOf('?') === -1) {
        live_url += '?';
    } else {
        live_url += '&';
    }
    return live_url + 't=' + sl_timestamp_to_pos(timestamp);
}

function song_list_load_data(callback) {
    app_load_json(song_list, '/database/song-list.json', callback, function(song_list_data) {
        function count_song(song_statistic, song_name, is_y, live_id, timestamp) {
            let song_info = {};
            if(song_name in song_statistic) {
                //Increase the counter.
                song_info = song_statistic[song_name];
                song_info.count += 1;
            } else {
                song_info = {'count': 1, 'y_count': [], 'b_count': [], 'last_live': [live_id, timestamp]};
            }
            if(is_y) {
                song_info.y_count.push([live_id, timestamp]);
            } else {
                song_info.b_count.push([live_id, timestamp]);
            }
            song_statistic[song_name] = song_info;
        }

        //Statistic the date and songs.
        let calender = {}, song_statistic = {}, medley_statistic = {};
        for(let i=0; i<song_list_data.length; ++i) {
            song_list_data[i].date = new Date(song_list_data[i].date);
            const live_data = song_list_data[i];
            const is_y = (live_data.url_y.length > 0);
            const songs = live_data.songs;
            const has_timestamp = live_data.timestamps !== undefined;
            let song_timestamp = [];
            if(has_timestamp) {
                song_timestamp = live_data.timestamps;
            }
            //Count the song seperately.
            let medley = [], normal = [], last_medley = false;
            for(let j=0; j<songs.length; ++j) {
                const song_pos = has_timestamp ? song_timestamp[j] : -1;
                if(songs[j][0] === '\t') {
                    //Last title is medley title, remove it.
                    if(!last_medley) {
                        normal.pop();
                    }
                    medley.push([songs[j], song_pos]);
                    last_medley = true;
                } else {
                    normal.push([songs[j], song_pos]);
                    last_medley = false;
                }
            }
            for(let j=0; j<normal.length; ++j) {
                const song_data = normal[j];
                count_song(song_statistic, song_data[0], is_y, i, song_data[1]);
            }
            for(let j=0; j<medley.length; ++j) {
                const song_data = medley[j];
                count_song(medley_statistic, song_data[0], is_y, i, song_data[1]);
            }
            //Count the year and date.
            const live_year = live_data.date.getFullYear();
            if(live_year in calender) {
                calender[live_year].push([live_data, i]);
            } else {
                calender[live_year] = [[live_data, i]];
            }
        }
        // Save the calender.
        song_list.calender = calender;
        // Save the song statistic.
        function convert_statistic_to_records(statistic_records) {
            let song_names = Object.keys(statistic_records);
            song_names.sort();
            let song_records = [];
            for(let i=0; i<song_names.length; ++i) {
                song_records.push([song_names[i], statistic_records[song_names[i]]]);
            }
            return song_records;
        }
        song_list.song_statistic = convert_statistic_to_records(song_statistic);
        song_list.medley_statistic = convert_statistic_to_records(medley_statistic);

        return song_list_data;
    });
}

function sl_render_nav(tab_id) {
    const navbar_ids = ['sl-live-list', 'sl-song-list', 'sl-medley-list', 'sl-song-statistic'];
    for(let i=0; i<navbar_ids.length; ++i) {
        document.getElementById(navbar_ids[i]).classList.remove('active');
        document.getElementById(navbar_ids[i] + '-label').innerHTML = app_i18n.navvar_song_list[i];
    }
    document.getElementById(tab_id).classList.add('active');
}

function sl_render_setori_years() {
    document.getElementById('sl-live-date-title').innerHTML = app_i18n.title_setori_date;
    // Render the years.
    let year_items = [];
    let year_list = Object.keys(song_list.calender);
    for(let i=0; i<year_list.length; ++i) {
        year_list[i] = parseInt(year_list[i]);
    }
    year_list = year_list.sort(function(a, b) { return a - b;}).reverse();
    for(let i=0; i<year_list.length; ++i) {
        year_items.push('<li><a class="dropdown-item" href="#setori&year='+year_list[i]+'">'+year_list[i]+'</a></li>');
    }
    document.getElementById('setori-year-menu').innerHTML = year_items.join('\n');
}

function sl_render_archive_link(setori_data, timestamp) {
    let live_icon = 'icon-youtube';
    if(setori_data.url_y.length === 0) {
        live_icon = 'icon-bilibili';
    }
    let live_url = app_archive_url(setori_data.url_y, setori_data.url_b);
    if(timestamp !== undefined) {
        live_url = sl_append_time_stamp(live_url, timestamp);
    }
    const setori_date = setori_data.date;
    let live_html = [
        app_hyperlink(live_url),
        '<span>',
        setori_date.getFullYear() + '/' + (setori_date.getMonth()+1) + '/' + setori_date.getDate() + ' @&nbsp;' +
        '</span><div class="text-icon ' + live_icon + '"></div>',
        '</a>'];
    return live_html.join('\n');
}

function sl_view_song_list_on(setori_data) {
    const record_date = setori_data.date,
        record_url = '#setori&year='+record_date.getFullYear()+'&month='+(record_date.getMonth()+1)+'&day='+record_date.getDate();
    return '<a class="half-opacity-text" href="'+record_url+'">'+app_i18n.view_setori+'</a>';
}

function sl_show_setori(setori_id) {
    const setori_data = song_list.records[setori_id];
    //Render the setori.
    document.getElementById('sl-live-title').innerHTML = setori_data.title;
    document.getElementById('sl-live-url').innerHTML = sl_render_archive_link(setori_data);
    //Render the list.
    let song_li_list = [], last_indent = false;
    const has_timestamp = setori_data.timestamps !== undefined;
    const song_detail = app_i18n.title_song_detail_info;
    const live_url = app_archive_url(setori_data.url_y, setori_data.url_b);
    for(let i=0; i<setori_data.songs.length; ++i) {
        //Check indent.
        const song_name = setori_data.songs[i];
        if(song_name[0] === '\t') {
            if(!last_indent) {
                song_li_list.push('<ul>');
            }
            last_indent = true;
        } else {
            if(last_indent) {
                song_li_list.push('</ul>');
            }
            last_indent = false;
        }
        let song_info_url = '#song-info&';
        if(last_indent) {
            song_info_url += 'is_medley&';
        }
        song_info_url += 'song_name=' + song_name_to_esc(setori_data.songs[i]);
        song_info_url = ', <a class="clickable-header half-opacity-text" href="'+song_info_url+'">'+song_detail+'</a>'
        let song_jump_url = has_timestamp ? sl_append_time_stamp(live_url, setori_data.timestamps[i]) : '';
        if(song_jump_url.length > 0) {
            let timestamp_text = sl_pos_to_timestamp(sl_timestamp_to_pos(setori_data.timestamps[i]));
            if(timestamp_text.length !== 0) {
                timestamp_text = ' (' + timestamp_text + ')';
            }
            song_jump_url = '<a class="clickable-header" href="'+song_jump_url+'" rel="noreferrer noopener" target="_blank">'
                + setori_data.songs[i] + timestamp_text +'</a>';
        } else {
            song_jump_url = setori_data.songs[i];
        }
        song_li_list.push('<li>' + song_jump_url + song_info_url + '</li>');
    }
    document.getElementById('sl-live-details').innerHTML = song_li_list.join('\n');
    //Render the year and date list.
    const setori_date = setori_data.date;
    document.getElementById('setori-year').innerHTML = setori_date.getFullYear().toString();
    function get_calender_date_str(date) {
        return time_str_minsec(date.getMonth()+1) + '-' + time_str_minsec(date.getDate());
    }
    document.getElementById('setori-date').innerHTML = get_calender_date_str(setori_date);
    let date_items = [];
    const year_dates = song_list.calender[setori_date.getFullYear()];
    for(let i=0; i<year_dates.length; ++i) {
        date_items.push('<li><a class="dropdown-item" href="#setori&id='+year_dates[i][1]+'">'+get_calender_date_str(year_dates[i][0].date)+'</a></li>');
    }
    document.getElementById('setori-date-menu').innerHTML = date_items.join('\n');
}

function song_list_load_panel(panel_url, panel_title, panel_navid, callback) {
    document.title = panel_title;
    header_set_item('nav-song-list');
    //Load the song list first.
    song_list_load_data(function() {
        //Fetch the song list global panel.
        app_load_panel('song-list.html', function() {
            //Update the panel.
            sl_render_nav(panel_navid);
            //Fetch the specifc panel URL.
            app_fetch(panel_url, function(panel_page_data) {
                document.getElementById('sl-panel').innerHTML = panel_page_data;
                //Call the post-render callback.
                if(callback !== undefined) {
                    callback();
                }
            });
        });
    });
}

function sl_find_statistic(target_list, target_name) {
    for(let i=0; i<target_list.length; ++i) {
        if(target_name === target_list[i][0]) {
            return target_list[i];
        }
    }
}

function sl_render_song_table(song_records, counter_id, result_id) {
    // Render the result counter.
    document.getElementById(counter_id).innerHTML = app_i18n.search_song_count(song_list.display_cache.length);
    // Render the song items.
    let song_items = [];
    for(let i=0; i<song_records.length; ++i) {
        const song_item = song_records[i];
        const song_info = song_item[1];
        let song_url = '#song-info&';
        if(song_list.current_song_mode === 1) {
            song_url += 'is_medley&';
        }
        song_url += 'song_name=' + song_name_to_esc(song_item[0]);
        const item_html = ['<tr>',
            '<td><a href="'+song_url+'">'+song_item[0]+'</a></td>',
            '<td>'+sl_render_archive_link(song_list.records[song_info.last_live[0]], song_info.last_live[1])+'</td>',
            '<td>'+song_info.count+'</td>',
            '<td>'+song_info.y_count.length+'</td>',
            '<td>'+song_info.b_count.length+'</td>',
            '</tr>'];
        song_items.push(item_html.join('\n'));
    }
    document.getElementById(result_id).innerHTML = song_items.join('\n');
}

function sl_set_song_table(target_records, counter_id, result_id) {
    // Save the target records.
    song_list.display_cache = target_records;
    //Sort the song items as expected.
    if(song_list.sort_column in sl_song_sort_function) {
        song_list.display_cache.sort(sl_song_sort_function[song_list.sort_column]);
        if(song_list.reverse) {
            song_list.display_cache.reverse();
        }
    }
    // Render the data.
    sl_render_song_table(song_list.display_cache, counter_id, result_id);
}

function sl_search_song_table(keywords, counter_id, result_id) {
    //Loop and search the result.
    keywords = keywords.toLowerCase();
    let search_results = [];
    if(keywords.length > 0) {
        for(let i=0; i<song_list.target_records.length; ++i) {
            if(song_list.target_records[i][0].toLowerCase().match(keywords)) {
                search_results.push(song_list.target_records[i]);
            }
        }
    } else {
        search_results = song_list.target_records;
    }
    //Set the result to be displayed.
    sl_set_song_table(search_results, counter_id, result_id);
}

function sl_on_column_click(column_id) {
    for(let i=0; i<sl_table_header_ids.length; ++i) {
        document.getElementById('sort-mark-' + i).innerHTML = '';
    }
    //Perform the new column sort or reverse the result.
    if(song_list.sort_column !== column_id) {
        song_list.sort_column = column_id;
        song_list.reverse = false;
    } else {
        song_list.reverse = !song_list.reverse;
    }
    //Update the sort mark.
    if(song_list.reverse) {
        document.getElementById('sort-mark-'+column_id).innerHTML = app_i18n.sort_descend;
    } else {
        document.getElementById('sort-mark-'+column_id).innerHTML = app_i18n.sort_ascend;
    }
    //Update the result.
    sl_set_song_table(song_list.display_cache, 'sl-search-counter', 'sl-search-results');
}

function sl_load_song_statistic(panel_navid, target_fetch) {
    song_list_load_panel('song-view.html', app_i18n.title_song_list, panel_navid, function() {
        //Configure the target records.
        song_list.target_records = target_fetch();
        // Set the place holder.
        document.getElementById('sl-search-song').setAttribute('placeholder', app_i18n.search_song);
        // Render the table header.
        const table_header = app_i18n.song_record_table_title;
        for(let i=0; i<sl_table_header_ids.length; ++i) {
            document.getElementById(sl_table_header_ids[i]).innerHTML = table_header[i];
            document.getElementById('sl-song-header-'+i).onclick = function(event) { sl_on_column_click(i); }
        }
        //Hook the search box.
        document.getElementById('sl-search-song').oninput = function(event) {
            sl_search_song_table(event.target.value, 'sl-search-counter', 'sl-search-results');
        };
        //Reset the sort column and reverse state.
        song_list.sort_column = 0;
        song_list.reverse = false;
        if(song_list.reverse) {
            document.getElementById('sort-mark-0').innerHTML = app_i18n.sort_descend;
        } else {
            document.getElementById('sort-mark-0').innerHTML = app_i18n.sort_ascend;
        }
        // Render the table.
        sl_set_song_table(song_list.target_records, 'sl-search-counter', 'sl-search-results');
    });
}

function sl_load_medley_list() {
    sl_load_song_statistic('sl-medley-list', function() { return song_list.medley_statistic; });
}

function sl_load_song_list() {
    sl_load_song_statistic('sl-song-list', function() { return song_list.song_statistic; });
}

function sl_load_song_info() {
    const song_name = esc_to_song_name(app_url.args.song_name), is_medley = 'is_medley' in app_url.args;
    song_list_load_panel('song-detail.html', app_i18n.title_song_info(song_name),
        is_medley ? 'sl-medley-list' : 'sl-song-list', function() {
        let title_element = document.getElementById('sl-song-title'), statistic_result = undefined;
        if(is_medley) {
            title_element.innerHTML = app_i18n.title_song_medley(song_name);
            statistic_result = sl_find_statistic(song_list.medley_statistic, song_name);
        } else {
            title_element.innerHTML = song_name;
            statistic_result = sl_find_statistic(song_list.song_statistic, song_name);
        }
        if(statistic_result === undefined) {
            return;
        }
        // Render the content.
        document.getElementById('sl-last-live-title').innerHTML = app_i18n.title_last_live;
        document.getElementById('sl-total-sing-title').innerHTML = app_i18n.title_sing_total;
        document.getElementById('sl-youtube-sing-title').innerHTML = app_i18n.title_sing_youtube;
        document.getElementById('sl-bilibili-sing-title').innerHTML = app_i18n.title_sing_bilibili;
        const song_info = statistic_result[1];
        document.getElementById('sl-last-live').innerHTML = sl_render_archive_link(song_list.records[song_info.last_live[0]], song_info.last_live[1]);
        document.getElementById('sl-total-times').innerHTML = song_info.count;
        document.getElementById('sl-youtube-times').innerHTML = song_info.y_count.length;
        document.getElementById('sl-bilibili-times').innerHTML = song_info.b_count.length;
        function render_song_list(count_list) {
            let live_html = [];
            for(let i=0; i<count_list.length; ++i) {
                const record = song_list.records[count_list[i][0]];
                live_html.push('<li>'+sl_render_archive_link(record, count_list[i][1])+', '+sl_view_song_list_on(record)+'</li>');
            }
            return live_html.join('\n');
        }
        document.getElementById('sl-youtube-lives').innerHTML = render_song_list(song_info.y_count);
        document.getElementById('sl-bilibili-lives').innerHTML = render_song_list(song_info.b_count);
    });
}

function sl_load_setori() {
    song_list_load_panel('setori.html', app_i18n.title_song_list, 'sl-live-list', function() {
        //Render the date selector.
        sl_render_setori_years();
        //Render the setori.
        if('id' in app_url.args) {
            // Check id validation.
            if(app_url.args.id < song_list.records.length) {
                sl_show_setori(app_url.args.id);
            }
            return;
        }
        if('year' in app_url.args) {
            // Check whether we have month and day.
            if('month' in app_url.args && 'day' in app_url.args) {
                // Find the nearest one.
                const target_calender = song_list.calender[parseInt(app_url.args['year'])],
                    target_month = parseInt(app_url.args['month']), target_day = parseInt(app_url.args['day']);
                for(let i=0; i<target_calender.length; ++i) {
                    const live_date = target_calender[i][0].date;
                    if((live_date.getMonth()+1) === target_month && live_date.getDate() === target_day) {
                        sl_show_setori(target_calender[i][1]);
                        return;
                    }
                }

            } else {
                // Use the latest one.
                sl_show_setori(song_list.calender[parseInt(app_url.args['year'])][0][1]);
            }
            return;
        }
        // Default, show the latest one.
        sl_show_setori(0);
    });
}