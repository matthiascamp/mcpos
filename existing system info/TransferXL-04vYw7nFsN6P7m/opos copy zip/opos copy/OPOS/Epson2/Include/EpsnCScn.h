/////////////////////////////////////////////////////////////////////
//
// EpsnCScn.H
//
//    header file for OPOS Applications.
//
// Modification history
// ------------------------------------------------------------------
// 01-09-14 OPOS Release ??                                     
// 02-12-16 OPOS Release 1.7                                     
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNCSCN_H)
#define      EPSNCSCN_H

#include "epson.h"


/////////////////////////////////////////////////////////////////////
// DirectIO Command
const LONG CHK_DI_ENDINSERTION_EXTEND	= 2;
const LONG CHK_DI_PRESCAN				= 3;
const LONG CHK_DI_READ_AREA				= 4;
const LONG CHK_DI_IMAGE_FILTER			= 5;
const LONG CHK_DI_ATTACHED_DATA			= 6;
const LONG CHK_DI_SIZE_OFFSET			= 7;
const LONG CHK_DI_BORDER_COLOR			= 8;
const LONG CHK_DI_ROTATE_IMAGE			= 9;
const LONG CHK_DI_TMSTORE_SET_INDEX		= 10;
const LONG CHK_DI_TMSTORE_ERRORMODE		= 11;
const LONG CHK_DI_TMSTORE_GET_FREEMEM	= 12;
const LONG CHK_DI_CHANGE_MODE			= 13;
const LONG CHK_DI_SHARPNESS_IMAGE		= 14;
const LONG CHK_DI_GET_SUPPORT_FUNCTION	= 15;
const LONG CHK_DI_RETRIEVEQUALITY		= 17;
const LONG CHK_DI_RECOVER_ERROR			= 18;

// param2 CHK_DI_ENDINSERTION_EXTEND
const LONG CHK_DI_EXTEND_DEFAULT		= 0x80000000;
const LONG CHK_DI_EXTEND_PRESCAN		= 0x00000001;
const LONG CHK_DI_EXTEND_READAREA		= 0x00000002;
const LONG CHK_DI_EXTEND_FILTER			= 0x00000004;
const LONG CHK_DI_EXTEND_ATTACHED		= 0x00000008;
const LONG CHK_DI_EXTEND_TMSTORE		= 0x00000010;

// param2 CHK_DI_ROTATE_IMAGE
const LONG CHK_DI_ROTATE_OFF			= 0;
const LONG CHK_DI_ROTATE_ON				= 1;

// param2 CHK_DI_TMSTORE_ERRORMODE
const LONG CHK_DI_ERRORMODE_CANCEL		= 0;
const LONG CHK_DI_ERRORMODE_RETRY		= 1;

// param2 CHK_DI_CHANGE_MODE
const LONG CHK_DI_MODE_CHECKSCANNER		= 0x00000000;
const LONG CHK_DI_MODE_CARDSCANNER		= 0x00000001;

// param2 CHK_DI_SHARPNESS_IMAGE
const LONG CHK_DI_SHARPNESS_OFF			= 0x00000000;
const LONG CHK_DI_SHARPNESS_ON			= 0x00000001;

// param2 CHK_DI_GET_SUPPORT_FUNCTION
const LONG CHK_DI_CHECKSCANNER			= 0x00000001;
const LONG CHK_DI_CARDSCANNER			= 0x00000002;
const LONG CHK_DI_TMSTORAGE				= 0x00000004;
const LONG CHK_DI_SHARPNESS				= 0x00000008;

// param2 CHK_DI_RETRIEVEQUALITY
const LONG CHK_DI_200X200				= 0x00000001;
const LONG CHK_DI_100X100				= 0x00000002;

/////////////////////////////////////////////////////////////////////
// ResultCodeExtennded
const LONG OPOS_ECHK_DATAERROR			= CHKERREXT + 3;
const LONG OPOS_ECHK_CANCEL				= CHKERREXT + 4;
const LONG OPOS_ECHK_DATAEND			= CHKERREXT + 5;
const LONG OPOS_ECHK_TIMEOUT			= CHKERREXT + 6;
const LONG OPOS_ECHK_NODATA				= CHKERREXT + 7;
const LONG OPOS_ECHK_RESPONSE			= CHKERREXT + 8;
const LONG OPOS_ECHK_PTRERROR			= CHKERREXT + 9;
const LONG OPOS_ECHK_BADSIZE			= CHKERREXT + 10;
const LONG OPOS_ECHK_ENCODE				= CHKERREXT + 11;
const LONG OPOS_ECHK_EXIST				= CHKERREXT + 13;
const LONG OPOS_ECHK_SAMEID				= CHKERREXT + 14;
const LONG OPOS_ECHK_SAMETAG			= CHKERREXT + 15;
const LONG OPOS_ECHK_TMSTORE_NOROOM		= CHKERREXT + 16;
const LONG OPOS_ECHK_TMSTORE_WRITE		= CHKERREXT + 17;


/////////////////////////////////////////////////////////////////////
// EPSON original CheckScanner

/////////////////////////////////////////////////////////////////////
// "CapFormat" Property Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_CIF_TIFF     =  0x00000002;
const LONG ECHK_CIF_BMP      =  0x00000004;
const LONG ECHK_CIF_JPEG     =  0x00000008;

/////////////////////////////////////////////////////////////////////
// "Color" Property Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_CCL_MONO         = 0x00000001;
const LONG ECHK_CCL_GRAYSCALE    = 0x00000002;
const LONG ECHK_CCL_16           = 0x00000004;
const LONG ECHK_CCL_256          = 0x00000008;
const LONG ECHK_CCL_FULL         = 0x00000010;

/////////////////////////////////////////////////////////////////////
// "Format" Property Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_IF_TIFF     =  2;
const LONG ECHK_IF_BMP      =  3;
const LONG ECHK_IF_JPEG     =  4;

/////////////////////////////////////////////////////////////////////
// "ImageMemoryStatus" Property Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_IMS_EMPTY    = 1;
const LONG ECHK_IMS_OK       = 2;
const LONG ECHK_IMS_FULL     = 3;

/////////////////////////////////////////////////////////////////////
// "MapMode" Property Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_MM_DOTS         = 1;
const LONG ECHK_MM_TWIPS        = 2;
const LONG ECHK_MM_ENGLISH      = 3;
const LONG ECHK_MM_METRIC       = 4;

/////////////////////////////////////////////////////////////////////
// "Color" Property Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_CL_MONO         = 1;
const LONG ECHK_CL_GRAYSCALE    = 2;
const LONG ECHK_CL_16           = 3;
const LONG ECHK_CL_256          = 4;
const LONG ECHK_CL_FULL         = 5;

/////////////////////////////////////////////////////////////////////
// ClearImage Method "By" Parameter Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_CLR_ALL                = 1;
const LONG ECHK_CLR_BY_FILEID          = 2;
const LONG ECHK_CLR_BY_FILEINDEX       = 3;
const LONG ECHK_CLR_BY_IMAGETAGDATA    = 4;

/////////////////////////////////////////////////////////////////////
// RetrieveMemory Method "By" Parameter Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_LOCATE_BY_FILEID       = 1;
const LONG ECHK_LOCATE_BY_FILEINDEX    = 2;
const LONG ECHK_LOCATE_BY_IMAGETAGDATA = 3;

/////////////////////////////////////////////////////////////////////
// "CropAreaID" Parameter Constants
/////////////////////////////////////////////////////////////////////

const LONG ECHK_CROP_AREA_RESET_ALL    = -2;
const LONG ECHK_CROP_AREA_ENTIRE_IMAGE = -1;
const LONG ECHK_CROP_AREA_RIGHT        = -1;
const LONG ECHK_CROP_AREA_BOTTOM       = -1;

/////////////////////////////////////////////////////////////////////
// StatusUpdateEvent
const LONG ECHK_SUE_SCANCOMPLETE		= 11;

/////////////////////////////////////////////////////////////////////
// DirectIO Command
//const LONG ECHK_DI_OUTPUT				= 1;
const LONG ECHK_DI_ENDINSERTION_EXTEND	= CHK_DI_ENDINSERTION_EXTEND;
const LONG ECHK_DI_PRESCAN				= CHK_DI_PRESCAN;
const LONG ECHK_DI_READ_AREA			= CHK_DI_READ_AREA;
const LONG ECHK_DI_IMAGE_FILTER			= CHK_DI_IMAGE_FILTER;
const LONG ECHK_DI_ATTACHED_DATA		= CHK_DI_ATTACHED_DATA;
const LONG ECHK_DI_SIZE_OFFSET			= CHK_DI_SIZE_OFFSET;
const LONG ECHK_DI_BORDER_COLOR			= CHK_DI_BORDER_COLOR;
const LONG ECHK_DI_ROTATE_IMAGE			= CHK_DI_ROTATE_IMAGE;
const LONG ECHK_DI_TMSTORE_SET_INDEX	= CHK_DI_TMSTORE_SET_INDEX;
const LONG ECHK_DI_TMSTORE_ERRORMODE	= CHK_DI_TMSTORE_ERRORMODE;
const LONG ECHK_DI_TMSTORE_GET_FREEMEM	= CHK_DI_TMSTORE_GET_FREEMEM;

// param2 ECHK_DI_ENDINSERTION_EXTEND
const LONG ECHK_DI_EXTEND_DEFAULT		= CHK_DI_EXTEND_DEFAULT;
const LONG ECHK_DI_EXTEND_PRESCAN		= CHK_DI_EXTEND_PRESCAN;
const LONG ECHK_DI_EXTEND_READAREA		= CHK_DI_EXTEND_READAREA;
const LONG ECHK_DI_EXTEND_FILTER		= CHK_DI_EXTEND_FILTER;
const LONG ECHK_DI_EXTEND_ATTACHED		= CHK_DI_EXTEND_ATTACHED;
const LONG ECHK_DI_EXTEND_TMSTORE		= CHK_DI_EXTEND_TMSTORE;

// param2 ECHK_DI_ROTATE_IMAGE
const LONG ECHK_DI_ROTATE_OFF			= CHK_DI_ROTATE_OFF;
const LONG ECHK_DI_ROTATE_ON			= CHK_DI_ROTATE_ON;

// param2 CHK_DI_TMSTORE_ERRORMODE
const LONG ECHK_DI_ERRORMODE_CANCEL		= CHK_DI_ERRORMODE_CANCEL;
const LONG ECHK_DI_ERRORMODE_RETRY		= CHK_DI_ERRORMODE_RETRY;

/////////////////////////////////////////////////////////////////////
// ResultCodeExtennded
const LONG OPOS_EECHK_NOCHECK			= 201;
const LONG OPOS_EECHK_CHECK				= 202;
const LONG OPOS_EECHK_DATAERROR			= OPOS_ECHK_DATAERROR;
const LONG OPOS_EECHK_CANCEL			= OPOS_ECHK_CANCEL;
const LONG OPOS_EECHK_DATAEND			= OPOS_ECHK_DATAEND;
const LONG OPOS_EECHK_TIMEOUT			= OPOS_ECHK_TIMEOUT;
const LONG OPOS_EECHK_NODATA			= OPOS_ECHK_NODATA;
const LONG OPOS_EECHK_RESPONSE			= OPOS_ECHK_RESPONSE;
const LONG OPOS_EECHK_PTRERROR			= OPOS_ECHK_PTRERROR;
const LONG OPOS_EECHK_BADSIZE			= OPOS_ECHK_BADSIZE;
const LONG OPOS_EECHK_ENCODE			= OPOS_ECHK_ENCODE;
const LONG OPOS_EECHK_NOROOM			= 203;
const LONG OPOS_EECHK_EXIST				= OPOS_ECHK_EXIST;
const LONG OPOS_EECHK_SAMEID			= OPOS_ECHK_SAMEID;
const LONG OPOS_EECHK_SAMETAG			= OPOS_ECHK_SAMETAG;
const LONG OPOS_EECHK_TMSTORE_NOROOM	= OPOS_ECHK_TMSTORE_NOROOM;
const LONG OPOS_EECHK_TMSTORE_WRITE		= OPOS_ECHK_TMSTORE_WRITE;

#endif                  // !defined(EPSNCSCN_H)

