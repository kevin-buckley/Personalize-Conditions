(function() {
    /**
     * SampleParam Condition (using params - passed at runtime via middleware)
     *
     * Checks if the current request has a sampleParam value matching the specified parameter.
     * The sampleParam is captured from the URL query string (?sampleParam=value)
     * and passed to the personalize API by the middleware's getExperienceParams override.
     *
     * This approach reads params at RUNTIME (current request) rather than from stored events.
     * The params are available in the context object passed to conditions.
     *
     * Personalize only publishes a condition whose script IS an IIFE, so this comment
     * has to stay inside the function: a comment above `(function() {` fails validation
     * with "Script is not an IIFE".
     *
     * Usage in Personalize:
     * - Create a custom condition with this template and publish it
     * - Set the sampleParam parameter to the value you want to match
     * - Apply to experiences/experiments to target visitors with that sample value
     *
     * Example: Target visitors who arrived with ?sampleParam=test123
     */
    var sampleParamValue = "[[sampleParam | string | | { required: true }]]";

    // Where earlier testing found the value, even though the middleware sets it top-level.
    if (request && request.params && request.params.utm && request.params.utm.sampleParam === sampleParamValue) {
        return true;
    }

    // Per Sitecore docs custom params sit at request.params level; kept in case that changes.
    if (request && request.params && request.params.sampleParam === sampleParamValue) {
        return true;
    }

    return false;
})();
