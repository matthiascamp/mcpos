/////////////////////////////////////////////////////////////////////
//
// EPSNMICR.H
//
//    header file for OPOS Applications.
//
// Modification history
// ------------------------------------------------------------------
// 96-05-14 OPOS Release 1.0                                     RYU
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNMICR_H)
#define      EPSNMICR_H

/////////////////////////////////////////////////////////////////////
// DirectIO Command
const long	MICR_DI_CLEANING			= 0;
const long	MICR_DI_GETSTATUS			= 1;
const long	MICR_DI_RECOVER_ERROR		= 5;
const long	MICR_DI_SELECT_CHECK_FONT	= 6;

/////////////////////////////////////////////////
// pData

// Dummy
const LONG MICR_DI_DUMMY			= 0;
// Select Check Font
const LONG MICR_DI_MICR_CHECK_E13B	= 1;
const LONG MICR_DI_MICR_CHECK_CMC7	= 2;

/////////////////////////////////////////////////////////////////////
// ResultCodeExtennded
const LONG OPOS_EMICR_ERRORDEVICESTATUS = MICRERREXT + 1;	// Not used
const LONG OPOS_EMICR_DATAERROR			= MICRERREXT + 2;
const LONG OPOS_EMICR_COMPORT			= MICRERREXT + 3;
const LONG OPOS_EMICR_DATAEND			= MICRERREXT + 4;
const LONG OPOS_EMICR_DIGITERROR		= MICRERREXT + 7;

#endif                  // !defined(EPSNMICR_H)

