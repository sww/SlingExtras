var SlingExtras = {
    initialized: false,

    init: function() {
        this.angular = angular.element(document);
        this.WatchService = this.angular.injector().get('WatchService');
        this.AppConstants = this.angular.injector().get('AppConstants');

        this.channelChangeListener();

        this.initialized = true;
        console.log('initialized', this.initialized);
    },

    getChannelId: function(url) {
        // https://watch.sling.com/watch?type=linear&id=22339910&channel=1081&action=resume
        var re = /channel=(\d+)/;
        var results = re.exec(url);
        if (results !== null) {
            return results[1];
        }

        return null;
    },

    switchToChannel: function(channelId) {
        console.log("Switching to channel", channelId);
        var channelId = parseInt(channelId, 10);
        var channel = {
            "id": channelId,
            "type": "channel"
        }

        this.WatchService.watch(channel, this.AppConstants.VIDEO.ACTIONS.RESUME);
    },

    channelChangeListener: function() {
        self = this
        this.angular.scope().$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
            var nextChannelId = self.getChannelId(nextUrl);
            if (!nextChannelId) {
                return;
            }

            var currentChannelId = self.getChannelId(currentUrl);
            if (currentChannelId && currentChannelId !== localStorage['lastChannelId']) {
                localStorage['lastChannelId'] = currentChannelId;
            }
        });
    },

    jump: function() {
        var currentChannelId = this.getChannelId(window.location.href);
        var previousChannelId = localStorage['lastChannelId'];

        if (!previousChannelId) {
            console.log("No channel to jump back to.");
            return;
        }

        if (currentChannelId) {
            localStorage['lastChannelId'] = currentChannelId;
        }

        this.switchToChannel(previousChannelId);
    }
}

window.addEventListener("keyup", function(e) {
    switch (e.key) {
    case 'i':
        if (!SlingExtras.initialized) {
            SlingExtras.init();
        }
        break;
    case 'j':
        SlingExtras.jump();
        break;
    }
}, false);
