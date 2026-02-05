/**
 * SampleParam Condition (using params - passed at runtime via middleware)
 * 
 * Checks if the current request has a sampleParam value matching the specified parameter.
 * The sampleParam is captured from the URL query string (?sample=value)
 * and passed to the personalize API via middleware getExtraUtmParams.
 * 
 * This approach reads params at RUNTIME (current request) rather than from stored events.
 * The params are available in the context object passed to conditions.
 * 
 * Usage in Personalize:
 * - Create a custom condition with this template
 * - Set the sampleParam parameter to the value you want to match
 * - Apply to experiences/experiments to target visitors with that sample value
 * 
 * Example: Target visitors who arrived with ?sample=test123
 */
(function() {
    var sampleParamValue = "[[sampleParam | string | | { required: true }]]";

    // check for request.params.utm['sampleParam'] as well (in case of different param naming)
    if (request && request.params && request.params.utm && request.params.utm['sampleParam'] === sampleParamValue) {
        return true;
    }

    //check inside utm params as well (if middleware is configured to put it there) ...but that's not the case, leave here incase it changes.
    if (request && request.params && request.params.utm && request.params.utm.sampleParam === sampleParamValue) {
        return true;
    }

    // Check params from the current request (passed via middleware)
    // Per Sitecore docs, custom params are at request.params level (not inside utm)... but that's not the case, leave here incase it changes.
    if (request && request.params && request.params.sampleParam === sampleParamValue) {
        return true;
    }


    return false;
})();
