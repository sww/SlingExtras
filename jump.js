const SlingExtras = {
    STORAGE_PREFIX: 'SlingExtras::',
    MAX_FAVORITES: 10,
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
        this.channelRecallKey = this.STORAGE_PREFIX + 'channelRecall';
        this.favoriteChannelKey = this.STORAGE_PREFIX + 'favoriteChannel';

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
        const channelRecallData = localStorage[this.channelRecallKey];
        const channelRecall =
            channelRecallData === undefined
                ? []
                : JSON.parse(channelRecallData);

        return channelRecall;
    },

    setChannelRecall: function(channelId) {
        const channelRecall = this.getChannelRecall();
        if (channelRecall.indexOf(channelId) > -1) {
            // nextChannelId exists in channelRecall, remove nextChannelId from its position.
            channelRecall.splice(channelRecall.indexOf(channelId), 1);
        }

        channelRecall.unshift(channelId);

        if (channelRecall.length > self.MAX_RECALL) {
            channelRecall.pop();
        }

        localStorage[this.channelRecallKey] = JSON.stringify(channelRecall);
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
        const channels = channelRecall
            .map(channel => {
                return [
                    this.Channels.getChannelByGuid(channel),
                    this.Channels.ExternalChannelService.getAssetOnNow({
                        channel_guid: channel,
                        type: 'channel'
                    })
                ];
            })
            .flat();

        Promise.all(channels).then(values => {
            const lines = [];
            for (var i = 0; i < values.length; i += 2) {
                lines.push(
                    i / 2 + ') ' + values[i].name + ': ' + values[i + 1].title
                );
            }
            this.ErrorService.displayMessage({
                displayType: 'toast',
                message: lines.join('<br />'),
                severity: 'info'
            });
        });
    },

    switchToRecentChannel: function(channelRecallIndex) {
        const channelRecall = this.getChannelRecall();
        if (channelRecallIndex > channelRecall.length) {
            console.debug(
                "channelRecallIndex is greater than channelRecall's length"
            );
            return;
        }
        this.switchToChannel(channelRecall[channelRecallIndex]);
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

                self.setChannelRecall(nextChannelId);
            });
    },

    jump: function() {
        const channelRecallData = localStorage[this.channelRecallKey];
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
            const channel = JSON.stringify({
                id: channelId,
                channelName: e.name
            });
            const storageKey = self.favoriteChannelKey + key;
            localStorage[storageKey] = channel;
            console.log('Set', storageKey, 'to', channel);
        });
    },

    showFavoriteChannels: function() {
        const favorites = [];
        for (var i = 0; i < this.MAX_FAVORITES; i++) {
            var favoriteChannel = localStorage[this.favoriteChannelKey + i];
            if (favoriteChannel === undefined) {
                continue;
            }

            const data = JSON.parse(favoriteChannel);
            data.index = i;
            favorites.push(data);
        }

        if (favorites.length < 1) {
            console.log('No favorites to display');
            return;
        }

        const channels = favorites
            .map(channel => {
                return [
                    channel,
                    this.Channels.ExternalChannelService.getAssetOnNow({
                        channel_guid: channel.id,
                        type: 'channel'
                    })
                ];
            })
            .flat();

        Promise.all(channels).then(values => {
            const lines = [];
            for (var i = 0; i < values.length; i += 2) {
                lines.push(
                    values[i].index + ') ' + values[i].channelName + ': ' + values[i + 1].title
                );
            }
            this.ErrorService.displayMessage({
                displayType: 'toast',
                message: lines.join('<br />'),
                severity: 'info'
            });
        });
    },

    switchToFavorite: function(key) {
        key = parseInt(key, 10);
        const channelData = localStorage[this.favoriteChannelKey + key];
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
            case 'v':
                SlingExtras.showFavoriteChannels();
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
            case ')':
            case '!':
            case '@':
            case '#':
            case '$':
                const index = e.keyCode - 48;
                if (index < 0 || index > SlingExtras.MAX_RECALL) {
                    console.log('Bad index for switchToRecentChannel');
                    return;
                }
                SlingExtras.switchToRecentChannel(index);
                break;
        }
    },
    false
);
