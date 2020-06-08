<div id="container">
    <ul id="newsTicker">
        {{#each news as |item|}}
        <li>
            <div class="news_row">
                {{#if item.show}}
                {{#if item.image}}
                <div class="news_image">
                    <img src="{{item.image}}" class="next" />
                </div>
                {{/if}}
                {{/if}}
                <div>
                    <div class="headline" data-toggle="modal" data-toggle="modal" data-target="#rssweb"
                        data-link="{{item.link}}" onclick="setSrcRss(this);">
                        <strong class="title">{{item.title}}</strong>
                        <hr class="hr_thin">
                        <div class="description">{{{item.desc}}}</div>
                        <div class="updated">Reported {{item.pubd}}</div>
                    </div>
                </div>
            </div>
        </li>
        {{/each}}
    </ul>
</div>