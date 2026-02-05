(function() {
    var returnValue = false;
    var shopWebIdParam = "[[shopWebId | string | | { required: true }]]";

    if (guest && guest.sessions && guest.sessions.length > 0) {
        var latestSession = guest.sessions[0];
        if (latestSession && latestSession.events && latestSession.events.length > 0) {
            for (var i = 0; i < latestSession.events.length; i++) {
                var event = latestSession.events[i];
                if (event.type === "IDENTITY" && event.arbitraryData && event.arbitraryData.ext) {
                    var shopWebId = event.arbitraryData.ext.shopWebId;
                    if (shopWebId === shopWebIdParam) {
                        returnValue = true;
                        break;
                    }
                }
            }
        }
    }

    return returnValue;
})();