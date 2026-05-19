VERSION 5.00
Object = "{CCB90080-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSTotals.ocx"
Begin VB.Form Step3 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 3 Display all file names."
   ClientHeight    =   2325
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5895
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   2325
   ScaleWidth      =   5895
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4620
      TabIndex        =   4
      Top             =   1785
      Width           =   990
   End
   Begin VB.ListBox List1 
      Height          =   1035
      Left            =   315
      TabIndex        =   2
      Top             =   525
      Width           =   1380
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1890
      TabIndex        =   1
      Top             =   525
      Width           =   3690
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Register"
      Height          =   345
      Left            =   4410
      TabIndex        =   0
      Top             =   840
      Width           =   1200
   End
   Begin OposTotals_CCOCtl.OPOSTotals OPOSTotals1 
      Left            =   3840
      OleObjectBlob   =   "Totals3.frx":0000
      Top             =   1680
   End
   Begin VB.Label Label1 
      Caption         =   "File List"
      Height          =   225
      Left            =   315
      TabIndex        =   3
      Top             =   210
      Width           =   1485
   End
End
Attribute VB_Name = "Step3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 3 Display all file names.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

' Write information in the selected file
'
Private Sub Command1_Click()

    Dim pSize As Long
    Dim pHandle As Long

    OPOSTotals1.Find List1.Text, pHandle, pSize
    OPOSTotals1.Write pHandle, Text1.Text, 0, LenDBCS(Text1.Text)

End Sub

Private Sub Form_Load()

    Dim i As Integer
    Dim pFileName As String

	pFileName = ""

    With OPOSTotals1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True

    'Make a list of the all files
        .FindByIndex 0, pFileName
        List1.Clear
        Do
            i = InStr(pFileName, vbCr)
            If i = 0 Then Exit Do
            List1.AddItem Left(pFileName, i - 1)
            pFileName = Mid(pFileName, i + 1)
        Loop
    End With

End Sub


Private Sub Form_Unload(Cancel As Integer)

    With OPOSTotals1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub


'Handle when a file is selected on the list.
'
Private Sub List1_Click()

    Dim pHandle As Long
    Dim pSize As Long
    Dim pData As String
    
    pData = ""

' Request a file handle from the selected file name.
    OPOSTotals1.Find List1.Text, pHandle, pSize
' Read a registered information from the requested file handle, and display it.
    OPOSTotals1.Read pHandle, pData, 0, pSize
    Text1.Text = pData

End Sub

Function LenDBCS(Data As String) As Long

    Dim i As Integer
    Dim m As Integer
    Dim c As Integer

    m = Len(Data)
    c = 0
    
    For i = 1 To m
        If Asc(Mid(Data, i, 1)) < 0 Then c = c + 1
    Next i

    LenDBCS = m + c

End Function
