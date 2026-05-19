VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step16 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 16 TM-P60PEELER sample program"
   ClientHeight    =   4215
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   7005
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   4215
   ScaleWidth      =   7005
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   375
      Left            =   5520
      TabIndex        =   3
      Top             =   3720
      Width           =   1215
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Enabled         =   0   'False
      Height          =   2175
      Left            =   3600
      TabIndex        =   8
      Top             =   240
      Width           =   3255
      Begin VB.CommandButton cmdReceipt 
         Caption         =   "Print Receipt"
         Enabled         =   0   'False
         Height          =   375
         Left            =   240
         TabIndex        =   2
         Top             =   1560
         Width           =   2775
      End
      Begin VB.CommandButton cmdAsync 
         Caption         =   "Asynchronous printing"
         Enabled         =   0   'False
         Height          =   375
         Left            =   240
         TabIndex        =   1
         Top             =   960
         Width           =   2775
      End
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Enabled         =   0   'False
         Height          =   375
         Left            =   240
         TabIndex        =   0
         Top             =   360
         Width           =   2775
      End
   End
   Begin VB.Frame Frame4 
      Caption         =   "Label"
      Enabled         =   0   'False
      Height          =   975
      Left            =   3600
      TabIndex        =   12
      Top             =   2520
      Width           =   3255
      Begin VB.CommandButton cmdPrintLabel 
         Caption         =   "Merchandise label printing"
         Enabled         =   0   'False
         Height          =   375
         Left            =   240
         TabIndex        =   7
         Top             =   360
         Width           =   2775
      End
   End
   Begin VB.Frame Frame2 
      Caption         =   "Set PaperLayout"
      Height          =   3375
      Left            =   120
      TabIndex        =   9
      Top             =   120
      Width           =   3255
      Begin VB.OptionButton optBMLabel 
         Caption         =   "Label with BlackMark"
         Height          =   375
         Left            =   480
         TabIndex        =   11
         Top             =   2520
         Width           =   2460
      End
      Begin VB.OptionButton optBMReceipt 
         Caption         =   "Roll Paper with BlackMark"
         Height          =   420
         Left            =   480
         TabIndex        =   10
         Top             =   2040
         Width           =   2625
      End
      Begin VB.OptionButton optLabel 
         Caption         =   "Label"
         Height          =   375
         Left            =   480
         TabIndex        =   6
         Top             =   1560
         Width           =   2415
      End
      Begin VB.OptionButton optReceipt 
         Caption         =   "Roll Paper"
         Height          =   375
         Left            =   480
         TabIndex        =   5
         Top             =   1080
         Width           =   2535
      End
      Begin VB.CommandButton cmdSetPaperType 
         Caption         =   "Set Paper Setting Infomation"
         Height          =   375
         Left            =   240
         TabIndex        =   4
         Top             =   360
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   4560
      OleObjectBlob   =   "Step16.frx":0000
      Top             =   3600
   End
End
Attribute VB_Name = "Step16"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Declare Sub Sleep Lib "kernel32" (ByVal sec As Long)

Dim bPaperSettingFlag As Boolean

Private Sub cmdAsync_Click()
    Dim bExit As Boolean
    Dim ESC As String * 1
    Dim BcData  As String
    Dim strDate As String

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    BcData = "4902720005074"
    bExit = False

    With OPOSPOSPrinter1
        .AsyncMode = True
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            .AsyncMode = False
            MousePointer = vbDefault
            Exit Sub
        End If
        
        If (.CapRecMarkFeed And PTR_MF_TO_CURRENT_TOF) Then
            .MarkFeed (PTR_MF_TO_CURRENT_TOF)
        End If

        'Loop
        Do
            'Whether a bitmap can be used, or not.
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + "apple    $1.00" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            strDate = Format(Now, "mmmm dd,")
            strDate = strDate + Format(Now, "yyyy")
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|cA" + "Best if used by " + strDate + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            If .CapRecBarCode = True Then
                .printBarCode PTR_S_RECEIPT, BcData, PTR_BCS_EAN13, 500, .RecLineWidth / 4, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
            End If
            
            'Feed the PTR_MF_TO_NEXT_TOF position.
            If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
                .MarkFeed (PTR_MF_TO_TAKEUP)
            ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
                .MarkFeed (PTR_MF_TO_NEXT_TOF)
            End If
            
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            
        'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer" + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                    ' "Cancel"has been selected
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                    ' "Retry" has been selected
                .ClearOutput
            Case vbIgnore                   ' "Ignore" has been selected
                Exit Do
            End Select
        Loop

        If bExit = False Then               'Has it been canceled?
            .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Cannot use a POS Printer.", vbExclamation
                .AsyncMode = False
                ' Clear the buffered data since the buffer retains print data
                ' when an error occurs during printing.
                .ClearOutput
                MousePointer = vbDefault
                Exit Sub
            End If
        End If
        .AsyncMode = False
    End With

    MousePointer = vbDefault

End Sub

Private Sub cmdExit_Click()

    Unload Me
 
End Sub

Private Sub cmdPrint_Click()

    Dim bExit As Boolean
    Dim lValue As Long
    Dim ESC As String * 1
    Dim BcData  As String
    Dim strDate As String

    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

' Initialization
    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    BcData = "4902720005074"
    bExit = False

    With OPOSPOSPrinter1
        If (.CapRecMarkFeed And PTR_MF_TO_CURRENT_TOF) Then
            .MarkFeed (PTR_MF_TO_CURRENT_TOF)
        End If
        
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            MousePointer = vbDefault
            Exit Sub
        End If

        'Loop
        Do
            'Whether a bitmap can be used, or not.
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + "apple    $1.00" + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            strDate = Format(Now, "mmmm dd,")
            strDate = strDate + Format(Now, "yyyy")
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|cA" + "Best if used by " + strDate + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
            If .CapRecBarCode = True Then
                .printBarCode PTR_S_RECEIPT, BcData, PTR_BCS_EAN13, 500, .RecLineWidth / 4, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
            End If
            
            'Feed the PTR_MF_TO_NEXT_TOF position.
            If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
                .MarkFeed (PTR_MF_TO_TAKEUP)
            ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
                .MarkFeed (PTR_MF_TO_NEXT_TOF)
            End If
            
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            
            'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer." + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                   ' "Cancel"has been selected
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                   ' "Retry"has been selected.
                .ClearOutput
            Case vbIgnore                  ' "Ignore" has been selected.
                Exit Do
            End Select
        Loop
        
        If bExit = False Then               'Has it been canceled?
            ' Wait until device is 'OPOS_S_IDLE'
            While .State <> OPOS_S_IDLE
                
            Wend
            .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Cannot use a POS Printer.", vbExclamation
                ' Clear the buffered data since the buffer retains print data
                ' when an error occurs during printing.
                .ClearOutput
                MousePointer = vbDefault
                Exit Sub
            End If
        End If
    End With

    MousePointer = vbDefault

End Sub

Private Sub cmdPrintLabel_Click()
    Dim lPMDescriptorList(2) As Long
    Dim lGetPMDescriptor As Long
    Dim lCount As Long
    Dim lVPosition As Long
    
    Dim bBitmapPrint As Boolean
    Dim bBarCodePrint As Boolean
    
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim strOutputData As String
    
    Dim strPMArea As String
    Dim strMaxHArea As String
    Dim strMaxVArea As String
    Dim strSetHPositon As String
    Dim strSetVPosition As String

    Dim strDrawPoint As String
    Dim pData As Long
 
'Check Receipt Function
    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If
'Check PageMode Function
    If (OPOSPOSPrinter1.CapRecPageMode = False) Then
        MsgBox "This printer doesn't have a PageMode printing function.", vbExclamation
        Exit Sub
    End If

' Initialization
    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    
    lPMDescriptorList(0) = PTR_PM_BM_ROTATE
    lPMDescriptorList(1) = PTR_PM_BC_ROTATE
    lPMDescriptorList(2) = PTR_PM_OPAQUE

    With OPOSPOSPrinter1
        If (.CapRecMarkFeed And PTR_MF_TO_CURRENT_TOF) Then
            .MarkFeed (PTR_MF_TO_CURRENT_TOF)
        End If
        
        .PageModeStation = PTR_S_RECEIPT
        lGetPMDescriptor = .PageModeDescriptor
        ' Select of target station of PageMode
        For lCount = 2 To 0 Step -1
            If (lPMDescriptorList(lCount) <= lGetPMDescriptor) Then
                lGetPMDescriptor = lGetPMDescriptor - lPMDescriptorList(lCount)
                Select Case lCount
                    Case 0
                        If .CapRecBitmap = True Then
                            If InStr(.RecBitmapRotationList, "R90") <> 0 Then
                                bBitmapPrint = True
                            End If
                        End If
                    Case 1
                        If .CapRecBarCode = True Then
                            If InStr(.RecBarCodeRotationList, "R90") <> 0 Then
                                bBarCodePrint = True
                            End If
                        End If
                End Select
            End If
        Next
        
        ' Initialization of PageMode area
        .PageModePrintArea = "0,0,0,0"
        .PageModeHorizontalPosition = 0
        .PageModeVerticalPosition = 0
        
        .PageModePrintDirection = PTR_PD_LEFT_TO_RIGHT
        strPMArea = .PageModeArea
        ' Gets the maximum size of PageMode area
        lCount = InStr(strPMArea, ",")
        strMaxHArea = Mid(strPMArea, 1, (lCount - 1))
        strMaxVArea = Mid(strPMArea, (lCount + 1))
        
        ' Set PageModePrintArea Property
        strSetVPosition = Str(2200 * 1)

        strPMArea = "0,0," + strMaxHArea + "," + strSetVPosition
        .PageModePrintArea = strPMArea
        
        ' PageMode
        .PageModePrint PTR_PM_PAGE_MODE
        
        ' Setting the outer frame.
        Dim iRectX As Integer
        Dim iRectY As Integer
        iRectX = Int(strMaxHArea) - 10
        iRectY = Int(strSetVPosition) - 20
        
        Dim iStartX As Integer
        Dim iStartY As Integer
        Dim iEndX As Integer
        Dim iEndY As Integer
        
        ' Drawing the rectangle.
        strDrawPoint = "0,0," + Str(iRectX) + "," + Str(iRectY)
        pData = PTR_DI_LINE_THICK
        .DirectIO PTR_DI_DRAWRECTANGLE, pData, strDrawPoint
         
        ' Sets the printing contents.
            
        .PageModeHorizontalPosition = 0 + 150
        .PageModeVerticalPosition = 0 + 100
        .PrintNormal PTR_S_RECEIPT, "Item"
        .PageModeVerticalPosition = .RecLineSpacing * 1 + 100
        .PrintNormal PTR_S_RECEIPT, "Price"
        .PageModeVerticalPosition = .RecLineSpacing * 2 + 100
        .PrintNormal PTR_S_RECEIPT, "Tax(5%)"
        .PageModeVerticalPosition = .RecLineSpacing * 3 + 100
        .PrintNormal PTR_S_RECEIPT, "Total"
        
        iStartX = 1200
        iEndX = 2100
        .PageModeHorizontalPosition = iStartX + 100
        
        .PageModeVerticalPosition = 0 + 100
        .PrintNormal PTR_S_RECEIPT, "Apple"
        
        iStartY = .RecLineSpacing * 1
        .PageModeVerticalPosition = iStartY + 100
        .PrintNormal PTR_S_RECEIPT, "$1.00"
        strDrawPoint = "0," + Str(iStartY) + "," + Str(iEndX) + "," + Str(iStartY)
        pData = 1
        .DirectIO PTR_DI_DRAWLINE, pData, strDrawPoint
        
        iStartY = .RecLineSpacing * 2
        .PageModeVerticalPosition = iStartY + 100
        .PrintNormal PTR_S_RECEIPT, "$0.05"
        strDrawPoint = "0," + Str(iStartY) + "," + Str(iEndX) + "," + Str(iStartY)
        pData = PTR_DI_LINE_THIN
        .DirectIO PTR_DI_DRAWLINE, pData, strDrawPoint
        
         iStartY = .RecLineSpacing * 3
        .PageModeVerticalPosition = iStartY + 100
        .PrintNormal PTR_S_RECEIPT, "$1.05"
        strDrawPoint = "0," + Str(iStartY) + "," + Str(iEndX) + "," + Str(iStartY)
        pData = PTR_DI_LINE_THIN
        .DirectIO PTR_DI_DRAWLINE, pData, strDrawPoint
                
        iStartY = .RecLineSpacing * 4
        .PageModeVerticalPosition = iStartY + 100
        
        ' Drawing the ruled line between the shop name and the item.
        strDrawPoint = "0," + Str(iStartY) + "," + Str(iRectX) + "," + Str(iStartY)
        pData = PTR_DI_LINE_NORMAL
        .DirectIO PTR_DI_DRAWLINE, pData, strDrawPoint
        
        ' Drawing the ruled line between the item name and the item.
        strDrawPoint = Str(iStartX) + "," + "0" + "," + Str(iStartX) + "," + Str(iStartY)
        pData = PTR_DI_LINE_NORMAL
        .DirectIO PTR_DI_DRAWLINE, pData, strDrawPoint
        
        iStartX = iEndX
        
        ' Drawing the ruled line between the item and the barcode.
        strDrawPoint = Str(iStartX) + "," + "0" + "," + Str(iStartX) + "," + Str(iStartY)
        pData = PTR_DI_LINE_NORMAL
        .DirectIO PTR_DI_DRAWLINE, pData, strDrawPoint
        
        ' Print Bitmap
        .PageModeVerticalPosition = .RecLineSpacing * 4 + 100
        .PageModeHorizontalPosition = 150
        If (bBitmapPrint) Then
           .PrintBitmap PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 10, PTR_BM_LEFT
        End If
        .PageModeVerticalPosition = .RecLineSpacing * 4 + 200
        .PrintNormal PTR_S_RECEIPT, ESC + "|2C" + ESC + "|cA" + "OPOS Store"
        
        ' Print BarCode
        If bBarCodePrint = True Then
'            .PageModeHorizontalPosition = iStartX + 100
            .PageModeHorizontalPosition = 2300
            .PageModeVerticalPosition = 500
            printBarCode
        End If
        
        .PageModePrint PTR_PM_NORMAL
        
        If (.ResultCode = OPOS_SUCCESS) Then
            If .CapRecPapercut = True Then          'Cut function, or not.
               .CutPaper 100
            End If
        Else
            MsgBox "Cannot use a POS Printer" + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended), vbCritical, "Label Printing"
            .PageModePrint PTR_PM_CANCEL
        End If
       
        'Feed the PTR_MF_TO_NEXT_TOF position.
        If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
            .MarkFeed (PTR_MF_TO_TAKEUP)
        ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
            .MarkFeed (PTR_MF_TO_NEXT_TOF)
        End If
    End With
End Sub

Private Sub cmdReceipt_Click()
    Dim bExit As Boolean
    Dim rcSpacing As Long
    Dim rcHeight As Long
    Dim ESC As String * 1
    Dim RotateType As Long
    Dim bBitmapPrint As Boolean
    Dim bBarCodePrint As Boolean
    Dim BcData  As String
    Dim strDate As String
    
    If OPOSPOSPrinter1.CapRecPresent = False Then
        MsgBox "This Printer doesn't have Receipt Station.", vbExclamation
        Exit Sub
    End If

'Check Rotate Function
    If OPOSPOSPrinter1.CapRecLeft90 = False Then
        MsgBox "This printer does not have a rotation printing function.", vbExclamation
        Exit Sub
    End If

    RotateType = 0
    bBitmapPrint = False
    bBarCodePrint = False
    With OPOSPOSPrinter1
        If .CapRecBitmap = True Then
            If InStr(.RecBitmapRotationList, "L90") <> 0 Then
                RotateType = RotateType + PTR_RP_BITMAP
                bBitmapPrint = True
            End If
        End If
        If .CapRecBarCode = True Then
            If InStr(.RecBarCodeRotationList, "L90") <> 0 Then
                RotateType = RotateType + PTR_RP_BARCODE
                bBarCodePrint = True
            End If
        End If
    End With


' Initialization
    ESC = Chr(&H1B)
    bExit = False
    BcData = "49027200"

    With OPOSPOSPrinter1
        If (.CapRecMarkFeed And PTR_MF_TO_CURRENT_TOF) Then
            .MarkFeed (PTR_MF_TO_CURRENT_TOF)
        End If
        
        'Batch processing mode
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            Exit Sub
        End If
        
        'Rotate 90
        .RotatePrint PTR_S_RECEIPT, PTR_RP_LEFT90 + RotateType

        'Loop
        Do
            rcSpacing = .RecLineSpacing               'Keep the default line spacing
            rcHeight = .RecLineHeight                 'Keep the default line height
            
            If .CapRecBitmap = True Then
                .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
            End If
            'Printing process
            .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC" + "apple" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|4C" + "$1.00" + vbCrLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|600uF"
            .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "Best if used " + vbLf
            .PrintNormal PTR_S_RECEIPT, "by" + vbLf
            strDate = Format(Now, "mmmm dd,")
            .PrintNormal PTR_S_RECEIPT, strDate + vbLf
            strDate = Format(Now, "yyyy")
            .PrintNormal PTR_S_RECEIPT, strDate + vbLf
            .PrintNormal PTR_S_RECEIPT, ESC + "|600uF"
            If .CapRecBarCode = True Then
                .printBarCode PTR_S_RECEIPT, BcData, PTR_BCS_EAN8, 500, .RecLineWidth / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW
            End If

            'When outputting normally,breakout of the loop.
            If .ResultCode = OPOS_SUCCESS Then Exit Do
            'When error occurs, display a message to ask the user whether retry or not.
            Select Case MsgBox("Fails to output to a printer." + vbCrLf + vbCrLf + "Retry?", vbAbortRetryIgnore + vbQuestion)
            Case vbAbort                    ' "Cancel"has been selected
                'Clear all the buffer, and exit.
                .ClearOutput
                bExit = True
                Exit Do
            Case vbRetry                    ' "Retry"has been selected.
                'Clear all the buffer data, and retry.
                .ClearOutput
            Case vbIgnore                   '"Ignore" has been selected.
                Exit Do
            End Select
        Loop

        .RotatePrint PTR_S_RECEIPT, PTR_RP_NORMAL

        If bExit = False Then
            If (.ResultCode = OPOS_SUCCESS) Then
                'Feed the PTR_MF_TO_NEXT_TOF position.
                If (.CapRecMarkFeed And PTR_MF_TO_TAKEUP) Then
                    .MarkFeed (PTR_MF_TO_TAKEUP)
                ElseIf (.CapRecMarkFeed And PTR_MF_TO_NEXT_TOF) Then
                    .MarkFeed (PTR_MF_TO_NEXT_TOF)
                End If
            Else
                MsgBox "Cannot use a POS Printer" + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended), 0, "Print Receipt"
                .ClearOutput
            End If
        End If

        ' Wait until device is 'OPOS_S_IDLE'
        While .State <> OPOS_S_IDLE
        Wend
        'Print all the buffer data, and exit the batch processing mode.
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Cannot use a POS Printer.", vbExclamation
            .RecLineSpacing = rcSpacing
            .RecLineHeight = rcHeight
            ' Clear the buffered data since the buffer retains print data
            ' when an error occurs during printing.
            .ClearOutput
            Exit Sub
        End If

        .RecLineSpacing = rcSpacing
        .RecLineHeight = rcHeight
    End With

End Sub

Private Sub cmdSetPaperType_Click()
' Setting Paper Layout Infomation To Service Object
    
    Dim iPaperType As Integer
    Dim strPaperSize As String
    Dim pData As Long
    Dim strParam As String
        
    ' Get Paprt Type From Radio Button
    If optReceipt = True Then
        iPaperType = 48
        strPaperSize = "0,0,0,0,0,6000"
    End If
    If optBMReceipt = True Then
        iPaperType = 51
        strPaperSize = "0,250,-250,0,0,6000"
    End If
    If optLabel = True Then
        iPaperType = 49
        strPaperSize = "0,150,250,0,-150,6000"
    End If
    If optBMLabel = True Then
        iPaperType = 50
        strPaperSize = "0,150,250,0,-150,6000"
    End If
        
    ' Create Third Parameter
    strParam = Str(iPaperType) + "," + strPaperSize
    strParam = Trim(strParam)
    
    OPOSPOSPrinter1.DirectIO PTR_DI_SET_PAPERLAYOUT, pData, strParam
    If OPOSPOSPrinter1.ResultCode <> OPOS_SUCCESS Then
        MsgBox "Failed to get the paper's information.", vbExclamation
        Exit Sub
    End If
    
    bPaperSettingFlag = True
    If iPaperType = 49 Or iPaperType = 50 Then
        cmdPrint.Enabled = False
        cmdAsync.Enabled = False
        cmdReceipt.Enabled = False
        Frame1.Enabled = False
        cmdPrintLabel.Enabled = True
        Frame4.Enabled = True
    ElseIf iPaperType = 48 Or iPaperType = 51 Then
        cmdPrint.Enabled = True
        cmdAsync.Enabled = True
        cmdReceipt.Enabled = True
        Frame1.Enabled = True
        cmdPrintLabel.Enabled = False
        Frame4.Enabled = False
    End If
End Sub

Private Sub OPOSPOSPrinter1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)

    If (MsgBox("Printer Error." + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended), vbOKCancel + vbInformation) = vbCancel) Then
        pErrorResponse = OPOS_ER_CLEAR
    End If
    
End Sub

Private Sub OPOSPOSPrinter1_OutputCompleteEvent(ByVal OutputID As Long)

'Notify that printing is completed when it is asnchronous.
    MsgBox "Complete printing", vbInformation

End Sub


Private Sub OPOSPOSPrinter1_StatusUpdateEvent(ByVal Data As Long)
'When there is a change of the status on the printer, the event is fired.

    Dim bRecEnb As Boolean

    bRecEnb = True

'Make messages for the each event information.
    Select Case Data
    Case PTR_SUE_COVER_OPEN         'Printer cover is open.
        bRecEnb = False
    Case PTR_SUE_REC_EMPTY          'No receipt paper.
        bRecEnb = False
    End Select


    With OPOSPOSPrinter1
        'Check receipt function and set button state.
        If .CapRecPresent = True And bRecEnb = True Then
            If bPaperSettingFlag = True Then
                If optReceipt = True Or optBMReceipt = True Then
                    cmdPrint.Enabled = True
                    cmdAsync.Enabled = True
                    cmdReceipt.Enabled = True
                    Frame1.Enabled = True
                    cmdPrintLabel.Enabled = False
                    Frame4.Enabled = False
                ElseIf optLabel = True Or optBMLabel = True Then
                    cmdPrint.Enabled = False
                    cmdAsync.Enabled = False
                    cmdReceipt.Enabled = False
                    Frame1.Enabled = False
                    cmdPrintLabel.Enabled = True
                    Frame4.Enabled = True
                End If
            End If
            Frame2.Enabled = True
            cmdSetPaperType.Enabled = True
            optReceipt.Enabled = True
            optLabel.Enabled = True
            optBMReceipt.Enabled = True
            optBMLabel.Enabled = True
        Else
            cmdPrint.Enabled = False
            cmdAsync.Enabled = False
            cmdReceipt.Enabled = False
            Frame1.Enabled = False
            
            Frame2.Enabled = False
            cmdSetPaperType.Enabled = False
            optReceipt.Enabled = False
            optLabel.Enabled = False
            optBMReceipt.Enabled = False
            optBMLabel.Enabled = False
            
            cmdPrintLabel.Enabled = False
            Frame4.Enabled = False
        End If
    
        'Check rotate print function and set button state.
        If (.CapRecLeft90 = False) Or (.CapRecRight90 = False) Then
            cmdReceipt.Enabled = False
        End If

    End With
    
    'Enable to [Close] button only.
    cmdExit.Enabled = True

End Sub

Private Sub OPOSPOSPrinter1_DirectIOEvent(ByVal EventNumber As Long, pData As Long, pString As String)
' Create Message Each Event Type
    Select Case EventNumber
        Case PTR_DIE_LABEL_REMOVAL
        MsgBox "Remove the label.", vbExclamation
    End Select

End Sub

Private Sub Form_Load()
    Dim strParam As String
    Dim RetryCount As Long
    
    bPaperSettingFlag = False
    With OPOSPOSPrinter1
        .Open "Unit1"
        'Check whether the device is succeed to open, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the device."
            GoTo LoadError
            Exit Sub
        End If
        
        .ClaimDevice 1000
        'Check whether the device is claim to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the device."
            GoTo LoadError
        End If

        .DeviceEnabled = True
        'Check whether the device is enable to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Disable to use the device."
            GoTo LoadError
            Exit Sub
        End If
        
        .MapMode = PTR_MM_METRIC
        .RecLetterQuality = True
        
        If .CapRecBitmap = True Then
            RetryCount = 0
            Do While RetryCount < 5
                .SetBitmap 1, PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 2, PTR_BM_CENTER
                If (.ResultCode = OPOS_E_ILLEGAL) And (.ResultCodeExtended = OPOS_EX_DEVBUSY) Then
                    RetryCount = RetryCount + 1
                    Sleep 1000
                Else
                    Exit Do
                End If
            Loop
            
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Fails to set bitmap."
                GoTo LoadError
            End If
        End If
        
        If (.CapRecLeft90 = False) Or (.CapRecRight90 = False) Then
            cmdReceipt.Enabled = False
        End If
        
        ' Sets the peel-off issuance mode.
        Dim pData As Long
        pData = PTR_DI_PEEL_OFF_MODE
        strParam = ""
        .DirectIO PTR_DI_OPERATION_MODE, pData, strParam
    
    End With
    
    MsgBox "First, specify the paper's type.", vbExclamation
    Exit Sub

'Error disposal
LoadError:
    Dim OBJ As Object
    'Disable all buttons
    For Each OBJ In Me
        If OBJ.Name <> "OPOSPOSPrinter1" Then
            OBJ.Enabled = False
        End If
    Next
    'Enable to [Close] button only.
    cmdExit.Enabled = True

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub optBMLabel_Click()
    txtSetPaperSize = "0,150,250,0,-150,6000"
End Sub

Private Sub optBMReceipt_Click()
    txtSetPaperSize = "0,250,-250,0,0,6000"
End Sub

Private Sub optLabel_Click()
    txtSetPaperSize = "0,150,250,0,-150,6000"
End Sub

Private Sub optReceipt_Click()
    txtSetPaperSize = "0,0,0,0,0,6000"
End Sub

Private Sub printBarCode()
' Printing the barcode.
' All the type of printable barcodes are described here.
' If the values of the set width and height, at the time of the execution,
' are not matched with the type and size of the paper, the following things will happen.
' 1.The barcode will not fit in the specified area.
' 2.The barcode will not print.
' 3.It will print extending over several sheets of label paper.
    
    Dim iBarCodeHeight As Integer
    Dim iBarCodeWidth As Integer
    Dim iBarCodeAlighment As Integer

    Dim iBarCodeIndex As Integer
    Dim lBarCodeItem As Long

    Dim strSeparater As String
    Dim strComposite As String
    
    Dim lComposite As Long
    lComposite = PTR_BCS_PDF417 * (16 ^ 4)
    
    strSeparater = "\|"
    strComposite = "1A2B3C4D5E" + strSeparater
    
    With OPOSPOSPrinter1
        iBarCodeHeight = 450
        iBarCodeWidth = .RecLineWidth / 4
        iBarCodeAlighment = PTR_BC_LEFT
        
        ' Select Barcode Type
        lBarCodeItem = PTR_BCS_EAN13

        ' Print BarCode
        Select Case lBarCodeItem
        Case PTR_BCS_EAN8
            .printBarCode PTR_S_RECEIPT, "4902720", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_EAN13
            .printBarCode PTR_S_RECEIPT, "4902720005074", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_EAN128
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_Code93
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_Code39
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_Code128
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_Code128_Parsed
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_UPCA
            .printBarCode PTR_S_RECEIPT, "012345678905", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_UPCE
            .printBarCode PTR_S_RECEIPT, "123456", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_Codabar
            .printBarCode PTR_S_RECEIPT, "A1234A", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_ITF
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_MAXICODE
            .printBarCode PTR_S_RECEIPT, Chr(&H30) + Chr(&H1D) + Chr(&H30) + Chr(&H1D) + Chr(&H30) + Chr(&H1D), lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 0
            .printBarCode PTR_S_RECEIPT, Chr(&H30) + Chr(&H1D) + Chr(&H30) + Chr(&H1D) + Chr(&H30) + Chr(&H1D), lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 1
            .printBarCode PTR_S_RECEIPT, "1A2B3C4D5E", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 2
            .printBarCode PTR_S_RECEIPT, "1A2B3C4D5E", lBarCodeItem, 1000, 1000, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_PDF417
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 3
            .printBarCode PTR_S_RECEIPT, "1A2B3C4D5E", lBarCodeItem, 1000, 1000, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 4
            .printBarCode PTR_S_RECEIPT, "1A2B3C4D5E", lBarCodeItem, 1000, 1000, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        
        'RSS14 And RSS Expanded
        Case PTR_BCS_RSS14
            .printBarCode PTR_S_RECEIPT, "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 5
            .printBarCode PTR_S_RECEIPT, "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 7
            .printBarCode PTR_S_RECEIPT, "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 8
            .printBarCode PTR_S_RECEIPT, "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_RSS_EXPANDED
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 6
            .printBarCode PTR_S_RECEIPT, "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 9
            .printBarCode PTR_S_RECEIPT, "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        
        ' Composite
        Case PTR_BCS_EAN8 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "4902720", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_EAN13 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "4902720005074", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_EAN128 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_UPCA + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "012345678905", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_UPCE + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "123456", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_RSS14 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_RSS_EXPANDED + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 5 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 7 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 8 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 6 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234567890123", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        Case PTR_BCS_OTHER + 9 + lComposite
            .printBarCode PTR_S_RECEIPT, strComposite + "1234", lBarCodeItem, iBarCodeHeight, iBarCodeWidth, iBarCodeAlighment, PTR_BC_TEXT_BELOW
        
        Case Else
            MsgBox "Unable to print the specified barcode.", vbExclamation
        End Select
                
            If (.ResultCode <> OPOS.OPOS_SUCCESS) Then
                MsgBox "Failed BarCode Printing.", vbExclamation
            End If
    End With
    
End Sub
