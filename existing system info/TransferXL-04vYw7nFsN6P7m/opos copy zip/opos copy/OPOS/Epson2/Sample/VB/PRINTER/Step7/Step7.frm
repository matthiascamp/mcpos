VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step7 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step  7  Use the asynchronous outputting"
   ClientHeight    =   2850
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6360
   LinkTopic       =   "Form5"
   MaxButton       =   0   'False
   ScaleHeight     =   2850
   ScaleWidth      =   6360
   Begin VB.CommandButton cmdExit 
      Cancel          =   -1  'True
      Caption         =   "Close"
      Height          =   330
      Left            =   3720
      TabIndex        =   3
      Top             =   2205
      Width           =   1065
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Height          =   1695
      Left            =   1440
      TabIndex        =   0
      Top             =   210
      Width           =   3375
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Height          =   435
         Left            =   315
         TabIndex        =   2
         Top             =   420
         Width           =   2775
      End
      Begin VB.CommandButton cmdAsync 
         Caption         =   "Asynchronous printing"
         Height          =   435
         Left            =   315
         TabIndex        =   1
         Top             =   945
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   2760
      OleObjectBlob   =   "Step7.frx":0000
      Top             =   2160
   End
End
Attribute VB_Name = "Step7"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 7  Use the asynchronous outputting
Option Explicit

Private Type ITEMDATA
    Name As String
    Price As Long
End Type

Private Function MakePrintString(lRecLineChars As Long, sBuf As String, sPrice As String)
    Dim sValue As String
    If lRecLineChars < (Len(sBuf) + Len(sPrice)) Then
        sValue = sBuf + sPrice
    Else
        sValue = sBuf + Space(lRecLineChars - (Len(sBuf) + Len(sPrice))) + sPrice
    End If
    
    MakePrintString = sValue
End Function

Private Sub cmdPrint_Click()

    Dim lValue As Long
    Dim i As Integer
    Dim idBuf(5) As ITEMDATA
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim sBuf As String
    Dim sPrice As String
    Dim sValue As String
    Dim sRecLineChars() As String
    Dim lRecLineCharsCount As Long

' When outputting to a printer,a mouse cursor becomes like a hourglass.
    MousePointer = vbHourglass

    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"

' Make a data of the buying goods
    idBuf(0).Name = "apples":       idBuf(0).Price = 10
    idBuf(1).Name = "grapes":       idBuf(1).Price = 20
    idBuf(2).Name = "bananas":      idBuf(2).Price = 30
    idBuf(3).Name = "lemons":       idBuf(3).Price = 40
    idBuf(4).Name = "oranges":      idBuf(4).Price = 50

    With OPOSPOSPrinter1
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate " + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2" + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
        
        'Change of the font size
        lRecLineCharsCount = GetRecLineChars(sRecLineChars)
        If lRecLineCharsCount >= 2 Then
            .RecLineChars = sRecLineChars(1)
            .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbLf
            .RecLineChars = sRecLineChars(0)
        Else
            .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbLf
        End If
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
    'Print buying goods
        lValue = 0
        For i = LBound(idBuf) To UBound(idBuf) - 1
            If .ResultCode <> OPOS_SUCCESS Then Exit For
            sBuf = idBuf(i).Name
            lValue = lValue + idBuf(i).Price
            sPrice = Format(idBuf(i).Price, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, sValue + vbLf
        Next
        .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
    'Print the total cost
        sBuf = "Tax excluded."
        sPrice = Format(lValue, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + sValue + vbLf
        sBuf = "Tax  5.0%"
        sPrice = Format(lValue * 0.05, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|uC" + sValue + vbLf
        sBuf = "Total"
        sPrice = Format(lValue * 1.05, "$#.00")
        sValue = MakePrintString((.RecLineChars \ 2), sBuf, sPrice)     'Because the width of characters of total is doubled, take this into consideration when computing.
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|2C" + sValue + vbLf
        sBuf = "Customer's payment"
        sPrice = Format(200, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + sValue + vbLf
        sBuf = "Change"
        sPrice = Format(200 - lValue * 1.05, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, sValue + vbLf
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
        .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"
        
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
    End With

' When a cursor is back to its default shape, it means the process ends.
    MousePointer = vbDefault

End Sub

Private Function GetRecLineChars(ByRef sRecLineChars() As String)
    Dim lIndex As Long
    Dim lCount As Long
    Dim sRecLineCharsList As String
    Dim i As Integer
    Dim lStartIndex As Long
    Dim lEndIndex As Long
        
        
    sRecLineCharsList = OPOSPOSPrinter1.RecLineCharsList
        
    If Len(sRecLineCharsList) = 0 Then
        GetRecLineChars = 0
    Else
        'Calculate the element count.
        lCount = 1
        lIndex = InStr(1, sRecLineCharsList, ",")
        While lIndex <> 0
            lCount = lCount + 1
            lIndex = lIndex + 1
            lIndex = InStr(lIndex, sRecLineCharsList, ",")
        Wend

        'Set the element to array.
        ReDim sRecLineChars(lCount)
    
        lStartIndex = 1
        For i = 0 To lCount - 1
            lEndIndex = InStr(lStartIndex, sRecLineCharsList, ",")
            If lEndIndex = 0 Then
                lEndIndex = Len(sRecLineCharsList)
            End If
            
            sRecLineChars(i) = Mid(sRecLineCharsList, lStartIndex, lEndIndex - 1)
            lStartIndex = lEndIndex + 1
        Next
    
        GetRecLineChars = lCount

    End If

End Function

Private Sub cmdAsync_Click()

    Dim lValue As Long
    Dim i As Integer
    Dim idBuf(4) As ITEMDATA
    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String
    Dim sBuf As String
    Dim sPrice As String
    Dim sValue As String

' When outputting to a printer,a mouse cursor becomes like a hourglass.
    MousePointer = vbHourglass

    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"

' Make a data of the buying goods
    idBuf(0).Name = "apples":       idBuf(0).Price = 10
    idBuf(1).Name = "grapes":       idBuf(1).Price = 20
    idBuf(2).Name = "bananas":      idBuf(2).Price = 30
    idBuf(3).Name = "lemons":       idBuf(3).Price = 40
    idBuf(4).Name = "oranges":      idBuf(4).Price = 50

    With OPOSPOSPrinter1
        'Afterwards, asynchronous output
        .AsyncMode = True
        
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate " + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2" + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
        .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
    'Print buying goods
        lValue = 0
        For i = LBound(idBuf) To UBound(idBuf)
            If .ResultCode <> OPOS_SUCCESS Then Exit For
            sBuf = idBuf(i).Name
            lValue = lValue + idBuf(i).Price
            sPrice = Format(idBuf(i).Price, "$#.00")
            sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
            .PrintNormal PTR_S_RECEIPT, sValue + vbLf
        Next
        .PrintNormal PTR_S_RECEIPT, ESC + "|200uF"
    'Print the total cost
        sBuf = "Tax excluded."
        sPrice = Format(lValue, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + sValue + vbLf
        sBuf = "Tax  5.0%"
        sPrice = Format(lValue * 0.05, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|uC" + sValue + vbLf
        sBuf = "Total"
        sPrice = Format(lValue * 1.05, "$#.00")
        sValue = MakePrintString((.RecLineChars \ 2), sBuf, sPrice)     'Because the width of characters of total is doubled, take this into consideration when computing.
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|2C" + sValue + vbLf
        sBuf = "Customer's payment"
        sPrice = Format(200, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + sValue + vbLf
        sBuf = "Change"
        sPrice = Format(200 - lValue * 1.05, "$#.00")
        sValue = MakePrintString(.RecLineChars, sBuf, sPrice)
        .PrintNormal PTR_S_RECEIPT, sValue + vbLf
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|500uF"
        .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW
        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"
        
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL

        'Back to the synchronous mode
        .AsyncMode = False
    End With

' When a cursor is back to its default shape, it means the process ends.
    MousePointer = vbDefault

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub OPOSPOSPrinter1_OutputCompleteEvent(ByVal OutputID As Long)

'Notify that printing is completed when it is asnchronous.
    MsgBox "Complete printing", vbInformation

End Sub

Private Sub Form_Load()

    With OPOSPOSPrinter1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True
        
        .MapMode = PTR_MM_METRIC
        .RecLetterQuality = True
        
        .SetBitmap 1, PTR_S_RECEIPT, App.Path + "\Logo.bmp", .RecLineWidth / 2, PTR_BM_CENTER
    End With

End Sub


Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub


