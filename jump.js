var SlingExtras = {
    initialized: false,

    init: function() {
        this.angular = angular.element(document);
        if (!this.angular) {
            console.error('Unable to load the Angular object.');
            return;
        }

        this.WatchService = this.angular.injector().get('WatchService');
        this.AppConstants = this.WatchService.AppConstants;

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

    switchToChannel: function(channelId) {
        console.debug('Switching to channel', channelId);

        this.WatchService.watch(
            { channel_guid: channelId, type: 'channel' },
            this.AppConstants.VIDEO.ACTIONS.RESUME
        );
    },

    jump: function() {
        const channelRecall = localStorage['FOREVER_USER::channelRecall'];
        console.log(channelRecall);
        if (!channelRecall) {
            console.log('Channel recall is empty.');
            return;
        }

        const previousChannelId = JSON.parse(channelRecall)[1];
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
