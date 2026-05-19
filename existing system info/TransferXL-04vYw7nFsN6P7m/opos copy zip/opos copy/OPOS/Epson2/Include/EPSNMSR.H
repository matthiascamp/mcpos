/////////////////////////////////////////////////////////////////////
//
// EPSNMSR.H
//
//   MSR header file for EPSON Applications.
//
// Modification history
// ------------------------------------------------------------------
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNMSR_H)
#define      EPSNMSR_H



/////////////////////////////////////////////////////////////////////
// "ResultCodeExtended" Property Constants for Scanner
/////////////////////////////////////////////////////////////////////
const LONG OPOS_EMSR_NOTSUPPORTDEVICE	= 1 + MSRERREXT;	// Device is not supported
const LONG OPOS_EMSR_KBHOOKOPEN			= 2 + MSRERREXT;	// KeyBoardHookDriver Open Error
const LONG OPOS_EMSR_KBHOOKSTART		= 3 + MSRERREXT;	// KeyBoardHookDriver Start Error
const LONG OPOS_EMSR_KBHOOKSTOP			= 4 + MSRERREXT;	// KeyBoardHookDriver Stop Error
const LONG OPOS_EMSR_KBHOOKCLOSE		= 5 + MSRERREXT;	// KeyBoardHookDriver Close Error
const LONG OPOS_EMSR_FAILURE			= 6 + MSRERREXT;	// 

/////////////////////////////////////////////////////////////////////
// "ErrorEvent" Event: "ResultCodeExtended" Parameter Constants
/////////////////////////////////////////////////////////////////////
const LONG OPOS_EMSR_SEPARATOR			= 10 + MSRERREXT;	// 
const LONG OPOS_EMSR_ACCOUNTNUMBER		= 11 + MSRERREXT;	// 
const LONG OPOS_EMSR_TITLE				= 12 + MSRERREXT;	// 
const LONG OPOS_EMSR_SECONDFIELD		= 13 + MSRERREXT;	// 
const LONG OPOS_EMSR_EXPIRATIONDATA		= 14 + MSRERREXT;	// 
const LONG OPOS_EMSR_SERVICECODE		= 15 + MSRERREXT;	// 
const LONG OPOS_EMSR_EXPIRATIONDATE		= OPOS_EMSR_EXPIRATIONDATA;
#endif                  // !defined(EPSNMSR_H)
