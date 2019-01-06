var SlingExtras = {
    initialized: false,

    init: function() {
        this.angular = angular.element(document);
        if (!this.angular) {
            console.error('Unable to load the Angular object.');
            return;
        }

        this.WatchService = this.angular.injector().get('WatchService');
        this.AppConstants = this.angular.injector().get('AppConstants');

        this.channelChangeListener();

        this.initialized = true;
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

    setLastChannelId: function(channelId) {
        console.debug('Attempting to set lastChannelId to', channelId);
        if (channelId && channelId !== localStorage['lastChannelId']) {
            console.debug('Set lastChannelId to', channelId);
            localStorage['lastChannelId'] = channelId;
        }
    },

    switchToChannel: function(channelId) {
        console.debug('Switching to channel', channelId);

        this.WatchService.watch(
            { channel_guid: channelId, type: 'channel' },
            this.AppConstants.VIDEO.ACTIONS.RESUME
        );
    },

    channelChangeListener: function() {
        self = this;
        this.angular
            .injector()
            .get('$rootScope')
            .$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
                var nextChannelId = self.getChannelId(nextUrl);
                if (!nextChannelId) {
                    return;
                }

                var currentChannelId = self.getChannelId(currentUrl);

                if (currentChannelId === nextChannelId) {
                    return;
                }

                self.setLastChannelId(currentChannelId);
            });
    },

    jump: function() {
        var currentChannelId = this.getChannelId(window.location.href);
        var previousChannelId = localStorage['lastChannelId'];

        if (!previousChannelId) {
            console.log('No channel to jump back to.');
            return;
        }

        this.setLastChannelId(currentChannelId);
        this.switchToChannel(previousChannelId);
    },

    setFavoriteChannel: function(key) {
        var channelId = this.getChannelId(window.location.href);
        if (!channelId) {
            console.debug('Unable to get channelId!');
            return;
        }

        localStorage['favoriteChannel' + key] = channelId;
        console.log('Set', key, 'to', channelId);
    },

    switchToFavorite: function(key) {
        key = parseInt(key, 10);
        channelId = localStorage['favoriteChannel' + key];
        if (!channelId) {
            console.debug('No channelId set for key', key);
            return;
        }

        this.switchToChannel(channelId);
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
