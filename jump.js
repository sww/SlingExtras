function $getChannelId(url) {
    // https://watch.sling.com/watch?type=linear&id=22339910&channel=1081&action=resume
    var re = /channel=(\d+)/;
    var results = re.exec(url);
    if (results !== null) {
        return results[1];
    }

    return null;
}

function $switchToChannel(channelId) {
    console.log("Switching to channel", channelId);
    var WatchService = angular.element(angular.element(document)[0]).injector().get('WatchService');
    var AppConstants = angular.element(angular.element(document)[0]).injector().get('AppConstants');

    var channelId = parseInt(channelId, 10);
    var channel = {
        "id": channelId,
        "type": "channel"
    }

    WatchService.watch(channel, AppConstants.VIDEO.ACTIONS.RESUME);
}

window.addEventListener("keyup", function(e) {
    if (e.key && e.key.toLowerCase() !== "j") {
        return;
    }

    var currentChannelId = $getChannelId(window.location.href);
    var previousChannelId = localStorage['lastChannelId'];

    if (!previousChannelId) {
        console.log("No channel to jump back to.");
        return;
    }

    if (currentChannelId) {
        localStorage['lastChannelId'] = currentChannelId;
    }

    $switchToChannel(previousChannelId);
});
