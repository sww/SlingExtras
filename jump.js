const SlingExtras = {
    STORAGE_PREFIX: 'SlingExtras::',
    MAX_RECALL: 5,

    initialized: false,

    init: function() {
        this.angular = angular.element(document);
        if (!this.angular) {
            console.error('Unable to load the Angular object.');
            return;
        }

        this.Channels = this.angular.injector().get('Channels');
        this.ErrorService = this.angular.injector().get('ErrorService');
        this.WatchService = this.angular.injector().get('WatchService');
        this.AppConstants = this.WatchService.AppConstants;

        this.initialized = true;
        this.channelChangeListener();

        console.debug('SlingExtras initialized:', this.initialized);
    },

    togglePlaybackControlsOverlay: function() {
        const sections = document.getElementsByClassName('watch');
        if (sections.length === 0) {
            console.log('Could not find overlay');
            return;
        }

        const playbackSection = sections.item(0);
        angular
            .element(playbackSection)
            .controller('watch').overlaysVisible = !angular
            .element(playbackSection)
            .controller('watch').overlaysVisible;
    },

    getChannelId: function(url) {
        // https://watch.sling.com/watch?type=linear&channelId=d52f32733fff4580888f22cc94c2c11c&action=resume
        const u = new URL(url);
        if (!u.pathname || u.pathname !== '/watch') {
            return null;
        }

        return u.searchParams.get('channelId');
    },

    getChannelRecall: function() {
        const channelRecallKey = self.STORAGE_PREFIX + 'channelRecall';
        const channelRecallData = localStorage[channelRecallKey];
        const channelRecall =
            channelRecallData === undefined
                ? []
                : JSON.parse(channelRecallData);

        return channelRecall;
    },

    switchToChannel: function(channelId) {
        console.debug('Switching to channel', channelId);

        this.WatchService.watch(
            { channel_guid: channelId, type: 'channel' },
            this.AppConstants.VIDEO.ACTIONS.RESUME
        );
    },

    showRecentChannels: function() {
        const channelRecall = this.getChannelRecall();
        const channels = channelRecall.map((channel, i) => {
            return this.Channels.getChannelByGuid(channel);
        });

        Promise.all(channels).then(values => {
            const message = values
                  .map((channel, i) => {
                      return i + ': ' + channel.name;
                  })
                  .join(', ');
            this.ErrorService.displayMessage({
                displayType: 'toast',
                message: message,
                severity: 'info'
            });
        });
    },

    channelChangeListener: function() {
        self = this;
        this.angular
            .injector()
            .get('$rootScope')
            .$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
                const nextChannelId = self.getChannelId(nextUrl);
                if (!nextChannelId) {
                    return;
                }

                const channelRecall = self.getChannelRecall();
                if (channelRecall.indexOf(nextChannelId) > -1) {
                    // nextChannelId exists in channelRecall, remove nextChannelId from its position.
                    channelRecall.splice(
                        channelRecall.indexOf(nextChannelId),
                        1
                    )[0];
                }

                channelRecall.unshift(nextChannelId);

                if (channelRecall.length > self.MAX_RECALL) {
                    channelRecall.pop();
                }

                localStorage[channelRecallKey] = JSON.stringify(channelRecall);
            });
    },

    jump: function() {
        const channelRecallData =
            localStorage[this.STORAGE_PREFIX + 'channelRecall'];
        if (!channelRecallData) {
            console.log('Channel recall is empty.');
            return;
        }

        const channelRecall = JSON.parse(channelRecallData);

        // If we're not currently watching anything, go back to the last channel.
        // Otherwise go to the channel before the one we're watching now.
        const u = new URL(window.location.href);
        const previousChannelId =
            !u.pathname || !u.pathname.startsWith('/watch')
                ? channelRecall[0]
                : channelRecall[1];
        if (!previousChannelId) {
            console.log('No channel to jump back to.');
            return;
        }

        this.switchToChannel(previousChannelId);
    },

    setFavoriteChannel: function(key) {
        var channelId = this.getChannelId(window.location.href);
        if (!channelId) {
            console.debug('Unable to get channelId!');
            return;
        }

        self = this;

        this.Channels.getChannelByGuid(channelId).then(function(e) {
            const channel = JSON.stringify({ id: channelId, channelName: e.name })
            const storageKey = self.STORAGE_PREFIX + 'favoriteChannel' + key;
            localStorage[storageKey] = channel;
            console.log('Set', storageKey, 'to', channel);
        });
    },

    switchToFavorite: function(key) {
        key = parseInt(key, 10);
        const channelData = localStorage[this.STORAGE_PREFIX + 'favoriteChannel' + key]
        if (!channelData) {
            console.log('Favorite channel not set for key: ', key);
            return;
        }

        const channel = JSON.parse(channelData);
        if (!channel || !channel.id) {
            console.debug('No channel set for key', key);
            return;
        }

        this.switchToChannel(channel.id);
    }
};

window.addEventListener(
    'keyup',
    function(e) {
        if (!SlingExtras.initialized) {
            SlingExtras.init();
        }

        switch (e.key) {
            case 'i':
                SlingExtras.init();
                break;
            case 'o':
                SlingExtras.togglePlaybackControlsOverlay();
                break;
            case 'j':
                SlingExtras.jump();
                break;
            case 'r':
                SlingExtras.showRecentChannels();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '0':
                e.ctrlKey
                    ? SlingExtras.setFavoriteChannel(e.key)
                    : SlingExtras.switchToFavorite(e.key);
                break;
        }
    },
    false
);
