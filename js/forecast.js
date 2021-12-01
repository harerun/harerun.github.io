let forecast = {records: []};

function forecast_is_today(today, forecast_day) {
    return today.getFullYear() === forecast_day.getFullYear() && today.getMonth() === forecast_day.getMonth() && today.getDate() === forecast_day.getDate();
}

function forecast_is_valid(today, forecast_day) {
    if(today.getFullYear() !== forecast_day.getFullYear()) {
        //Ignore the date.
        return false;
    }
    if(today.getMonth() < forecast_day.getMonth()) {
        return true;
    }
    return today.getMonth() === forecast_day.getMonth() && (today.getDate() <= forecast_day.getDate());
}

function forecast_render() {
    function parse_forecast_time(time_str) {
        let colon_pos = time_str.indexOf(':');
        if(colon_pos === -1) {
            return [];
        }
        //Parse the hour and minute.
        return [parseInt(time_str.substr(0, colon_pos)), parseInt(time_str.substr(colon_pos+1))];
    }

    // Check the forecast result.
    if(forecast.records.length === 0) {
        return;
    }
    let display_list = [], today_list = [];
    const local_date = new Date();
    //Convert the forecast date to date.
    for(let i=0; i<forecast.records.length; ++i) {
        const forecast_item = forecast.records[i];
        //The time is JST.
        if(forecast_is_today(local_date, forecast_item.date)) {
            today_list.push(forecast_item);
        } else {
            display_list.push(forecast_item);
        }
    }
    let forecast_html = ['<div class="alert alert-info" role="alert">'];
    function render_forecast(title, display_list) {
        forecast_html.push('<span>'+title+'</span><div><div class="alert-title-filling"></div>');
        for(let i=0; i<display_list.length; ++i) {
            const sdate = display_list[i].date;
            const stime = display_list[i].time;
            const sicon = display_list[i].platform === 'b' ? 'icon-bilibili' : 'icon-youtube';
            let stream_info = ['<div class="time-row">',
                app_hyperlink(display_list[i].url),
                '<div class="text-icon ' + sicon + '">',
                '</div>',
                sdate.getFullYear() + '-'+time_str_minsec(sdate.getMonth()+1)+'-'+time_str_minsec(sdate.getDate())+'  '+
                '('+app_i18n.day_of_the_week[sdate.getDay()]+') '+ stime[0]+':'+time_str_minsec(stime[1])+'(JST) / '+
                (stime[0]-1)+':'+time_str_minsec(stime[1])+'(CST)  '+display_list[i].title,
                '</a>',
                '</div>'];
            forecast_html.push(stream_info.join(''));
        }
        forecast_html.push('</div>');
    }

    if(today_list.length > 0) {
        render_forecast(app_i18n.title_forecast_today, today_list);
    }
    if(display_list.length > 0) {
        render_forecast(app_i18n.title_forecast, display_list);
    }
    forecast_html.push('</div>');
    document.getElementById('forecast').innerHTML = forecast_html.join('');
}

function forecast_load_data(callback) {
    function parse_time(time_str) {
        let colon_pos = time_str.indexOf(':');
        if(colon_pos === -1) {
            return [];
        }
        //Parse the hour and minute.
        return [parseInt(time_str.substr(0, colon_pos)), parseInt(time_str.substr(colon_pos+1))];
    }

    app_load_json(forecast, '/database/forecast.json', callback, function(forecast_data) {
        if(forecast_data.length === 0) {
            return [];
        }
        const local_date = new Date();
        let valid_forecast = [];
        for(let i=0; i<forecast_data.length; ++i) {
            forecast_data[i].date = new Date(forecast_data[i].date);
            if(!forecast_is_valid(local_date, forecast_data[i].date)) {
                continue;
            }
            //The time is JST.
            forecast_data[i].time = parse_time(forecast_data[i].time);
            if(forecast_data[i].platform === "b") {
                //Bilibili live, the URL is fixed.
                forecast_data[i].url = "https://live.bilibili.com/21547895";
            }
            valid_forecast.push(forecast_data[i]);
        }
        return valid_forecast;
    });
}