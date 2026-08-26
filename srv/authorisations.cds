using {ClaimAppService} from './claim-app-service';
using {ConfigAppService} from './config-app-service';

annotate ClaimAppService with @(requires: 'authenticated-user');
annotate ConfigAppService with @(requires: 'authenticated-user');


// Claims App Service Auths
annotate ClaimAppService.Claims with @(restrict: [
    
    { grant: '*', to: ['admin'] },
    { grant: 'READ', to: ['finance','operator','reviewer'],
      where: '$user.claim_type = type_id' },
    { grant: 'CREATE', 
      to: ['operator', 'reviewer'], 
      where: '$user.claim_type = type_id' },
    { grant: 'UPDATE', to: ['operator', 'finance','reviewer'] },
    { grant: 'DELETE', to: ['operator', 'finance','reviewer'] },
    

    { grant: 'submitForReview', to: ['operator', 'reviewer']  },
    { grant: 'requestInfo', to: ['reviewer'] },
    { grant: 'submitReviewApprove', to: ['reviewer'] },
    { grant: 'submitReviewReject', to: ['reviewer'] },
    { grant: 'submitSendToBrewer', to: ['reviewer'] },
    { grant: 'submitBrewerAccepted', to: ['reviewer'] },
    { grant: 'submitBrewerRejected', to: ['reviewer'] },
    { grant: 'submitFinanceComplete', to: ['finance'] }
    
]);

annotate ClaimAppService.ClaimType with @(restrict: [
    { grant: '*', to: ['admin'] },
    { grant: 'READ', to: ['finance','operator','reviewer'],
    where: '$user.claim_type = id' }
]);


// Config App Service Auths
annotate ConfigAppService.ConfigSettings with @(restrict: [
    { grant: '*', to: ['admin'] },
    { grant: 'READ', to: ['finance','operator','reviewer'] }
]);

annotate ConfigAppService.CurrencyConversion with @(restrict: [
    { grant: '*', to: ['admin'] },
    { grant: 'READ', to: ['finance','operator','reviewer'] }
]);







