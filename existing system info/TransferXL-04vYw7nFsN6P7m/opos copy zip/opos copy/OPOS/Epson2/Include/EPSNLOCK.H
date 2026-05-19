/////////////////////////////////////////////////////////////////////
//
// EPSNLOCK.H
//
//   LOCK header file for EPSON Applications.
//
// Modification history
// ------------------------------------------------------------------
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNLOCK_H)
#define      EPSNLOCK_H



/////////////////////////////////////////////////////////////////////
// "ResultCodeExtended" Property Constants for Scanner
/////////////////////////////////////////////////////////////////////
const LONG OPOS_ELOCK_NOTSUPPORTDEVICE	= 1 + LOCKERREXT;	// Device is not supported
const LONG OPOS_ELOCK_KBHOOKOPEN		= 2 + LOCKERREXT;	// KeyBoardHookDriver Open Error
const LONG OPOS_ELOCK_KBHOOKSTART		= 3 + LOCKERREXT;	// KeyBoardHookDriver Start Error
const LONG OPOS_ELOCK_KBHOOKSTOP		= 4 + LOCKERREXT;	// KeyBoardHookDriver Stop Error
const LONG OPOS_ELOCK_KBHOOKCLOSE		= 5 + LOCKERREXT;	// KeyBoardHookDriver Close Error
const LONG OPOS_ELOCK_FAILURE			= 6 + LOCKERREXT;	// 

#endif                  // !defined(EPSNLOCK_H)
